from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os, shutil
from datetime import date, timedelta

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
def check_threshold_and_create_donation(db: Session):
    today = date.today()
    products = db.query(models.BakeryInventory).all()

    for p in products:
        exp_date = p.expiration_date
        trigger_date = exp_date - timedelta(days=p.threshold or 0)

        existing = db.query(models.Donation).filter(
            models.Donation.bakery_inventory_id == p.id
        ).first()

        if today >= trigger_date and today <= exp_date:
            # Product is within donation window
            if existing:
                existing.name = p.name
                existing.image = p.image
                existing.quantity = p.quantity
                existing.threshold = p.threshold
                existing.creation_date = p.creation_date
                existing.expiration_date = p.expiration_date
                existing.uploaded = p.uploaded
                existing.description = p.description
                if existing.status == "unavailable":
                    existing.status = "available"  # 👈 available for donation
            else:
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
                    description=p.description,
                    status="available"
                )
                db.add(donation)
        elif exp_date < today:
            # expired → mark as unavailable
            if existing:
                existing.status = "unavailable"

    # Remove donations for expired inventory
    expired_donations = db.query(models.Donation).join(
        models.BakeryInventory,
        models.Donation.bakery_inventory_id == models.BakeryInventory.id
    ).filter(
        models.BakeryInventory.expiration_date < today
    ).all()

    for d in expired_donations:
        db.delete(d)
        print(f"Removed expired donation for {d.name}")

    db.commit()
    print("Donation sync completed")
    
@router.put("/inventory/{inventory_id}/status")
def update_inventory_status(
    inventory_id: int,
    data: schemas.StatusUpdate,
    db: Session = Depends(database.get_db)
):
    inventory = db.query(models.BakeryInventory).filter(models.BakeryInventory.id == inventory_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")

    inventory.status = data.status
    if data.charity_id:
        inventory.donated_to = data.charity_id

    db.commit()
    db.refresh(inventory)
    return {"message": "Status updated", "inventory": inventory}