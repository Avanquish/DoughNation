from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os, shutil
from datetime import datetime, timedelta

from app import models, database, schemas, auth, crud

router = APIRouter()
UPLOAD_DIR = "uploads"

# --- INVENTORY ---
@router.post("/inventory", response_model=schemas.BakeryInventoryOut)
def add_inventory(
    name: str = Form(...),
    image: UploadFile = File(...),
    quantity: int = Form(...),
    creation_date: str = Form(...),
    expiration_date: str = Form(...),
    threshold: int = Form(...),
    uploaded: str = Form(...),
    description: str = Form(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can add inventory")

    # Save image
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, image.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    new_item = crud.create_inventory(
        db=db,
        bakery_id=current_user.id,
        name=name,
        image=file_path,
        quantity=quantity,
        creation_date=creation_date,
        expiration_date=expiration_date,
        threshold=threshold,
        uploaded=uploaded,
        description=description
    )

# To add product to donation table if reach threshold
    check_threshold_and_create_donation(db)

    return new_item


@router.get("/inventory", response_model=List[schemas.BakeryInventoryOut])
def list_inventory(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can view inventory")
    return crud.list_inventory(db, bakery_id=current_user.id)

@router.put("/inventory/{inventory_id}", response_model=schemas.BakeryInventoryOut)
def update_inventory(
    inventory_id: int,
    name: str = Form(...),
    image: UploadFile = File(None),
    quantity: int = Form(...),
    creation_date: str = Form(...),
    expiration_date: str = Form(...),
    threshold: int = Form(...),
    uploaded: str = Form(...),
    description: str = Form(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can update inventory")

    image_path = None
    if image:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        image_path = os.path.join(UPLOAD_DIR, image.filename)
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

    updated_item =  crud.update_inventory(
        db=db,
        inventory_id=inventory_id,
        bakery_id=current_user.id,
        name=name,
        image=image_path,  # Only update if new image uploaded
        quantity=quantity,
        creation_date=creation_date,
        expiration_date=expiration_date,
        threshold=threshold,
        uploaded=uploaded,
        description=description
    )

# To apply the edit on donation table
    check_threshold_and_create_donation(db)

    return updated_item

# Bakery Inventory delete function
@router.delete("/inventory/{inventory_id}", response_model=dict)
def delete_inventory(
    inventory_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    product = db.query(models.BakeryInventory).filter(models.BakeryInventory.id == inventory_id).first()

    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can delete inventory")

    crud.delete_inventory(db=db, inventory_id=inventory_id, bakery_id=current_user.id)
    return {"message": "Inventory item deleted successfully"}


# ---Check threshold and create donation ---
def check_threshold_and_create_donation(db: Session, bakery_id: int):

   # Fetch products for donation
    products = (
    db.query(models.BakeryInventory)
    .filter(
        models.BakeryInventory.bakery_id == bakery_id,  # specific bakery
        models.BakeryInventory.expiration_date > datetime.today(),  # not expired yet
        models.BakeryInventory.expiration_date <= datetime.today() + timedelta(days=2)  # within 2 days
    )
    .all()
)

    print(f"Found {len(products)} products that reached threshold date")

    for p in products:
        # Look for donation linked to this inventory item
        existing = db.query(models.Donation).filter(
            models.Donation.bakery_inventory_id == p.id
        ).first()

        if existing:
            # Update existing donation
            existing.name = p.name
            existing.image = p.image
            existing.quantity = p.quantity
            existing.threshold = p.threshold
            existing.creation_date = p.creation_date
            existing.expiration_date = p.expiration_date
            existing.uploaded = p.uploaded
            existing.description = p.description
            print(f"Updated donation for {p.name}")
        else:
            # Create new donation
            donation = models.Donation(
                bakery_inventory_id=p.id,
                bakery_id=p.bakery_id,
                name=p.name,
                image=p.image,
                quantity=p.quantity,
                threshold=p.threshold,
                creation_date=p.creation_date,
                expiration_date=p.expiration_date,
                uploaded=p.uploaded,
                description=p.description
            )
            db.add(donation)
            print(f"Created donation for {p.name}")

    db.commit()
    print("All donations committed")