from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os, shutil
from datetime import datetime, timedelta
from sqlalchemy import func

from app import models, database, schemas, auth, crud

from app.routes.cnotification import process_geofence_notifications

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
# To apply the edit on bakery inventory table
    check_inventory_status(db)

    return new_item


@router.get("/inventory", response_model=List[schemas.BakeryInventoryOut])
def list_inventory(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can view inventory")
    
    # To apply the edit on bakery inventory table
    check_inventory_status(db)

    inventory_items = crud.list_inventory(db, bakery_id=current_user.id)
    updated_items = []

    for item in inventory_items:
        # Check pending donation requests via Donation → DonationRequest
        pending_request = db.query(models.DonationRequest).join(models.Donation).filter(
            models.Donation.bakery_inventory_id == item.id,
            models.DonationRequest.status == "pending"
        ).first()

        item_dict = item.__dict__.copy()
        item_dict["is_requested"] = item.status.lower() == "requested"
        item_dict["is_donated"] = item.status.lower() == "donated"

        updated_items.append(item_dict)

    return updated_items


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
# To apply the edit on bakery inventory table
    check_inventory_status(db)

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

# To apply the edit on bakery inventory table
    check_inventory_status(db)

    return {"message": "Inventory item deleted successfully"}


# ---Check threshold and create donation ---
def check_threshold_and_create_donation(db: Session):
    today = datetime.today().date()
    bakery_ids_triggered = set()

    # Fetch all bakery products that are not yet expired
    products = db.query(models.BakeryInventory).all()
    print(f"[Scheduler] Checking {len(products)} inventory items against threshold...")

    for p in products:
        exp_date = p.expiration_date
        threshold_days = p.threshold
        trigger_date = exp_date - timedelta(days=threshold_days)

        # Remove donations if inventory is fully donated or quantity <= 0
        if p.quantity <= 0 or p.status == "donated":
            existing = db.query(models.Donation).filter(
                models.Donation.bakery_inventory_id == p.id
            ).first()
            if existing:
                db.delete(existing)
                print(f"Removed donation for {p.name} (quantity zero/donated)")
            continue
    
        # Check if a donation already exists
        existing = db.query(models.Donation).filter(
            models.Donation.bakery_inventory_id == p.id
        ).first()

        if existing:
            existing.quantity = p.quantity
            existing.name = p.name
            existing.image = p.image
            existing.threshold = p.threshold
            existing.creation_date = p.creation_date
            existing.expiration_date = p.expiration_date
            existing.uploaded = p.uploaded
            existing.description = p.description
            print(f"Updated donation for {p.name} (quantity: {p.quantity})")
            bakery_ids_triggered.add(p.bakery_id)

        elif today >= trigger_date:
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
            print(f"Created donation for {p.name} (quantity: {p.quantity})")
            bakery_ids_triggered.add(p.bakery_id)

        else:
            if existing:
                db.delete(existing)
                print(f"Removed donation for {p.name} (threshold not reached)")

    # Remove donations for expired inventory
    expired_donations = (
        db.query(models.Donation)
        .join(models.BakeryInventory, models.Donation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.Donation.expiration_date <= today)
        .all()
    )
    for d in expired_donations:
        db.delete(d)
        print(f"Removed expired donation for {d.name}")

    db.commit()
    print("[Scheduler] Donation sync completed")

    #  Run geofence only for bakeries that had updates
    for b_id in bakery_ids_triggered:
        print(f"[Scheduler] Running geofence for bakery {b_id}")
        process_geofence_notifications(db, b_id)


def check_inventory_status(db: Session):
    today = datetime.today().date()

    # Fetch all bakery products
    products = db.query(models.BakeryInventory).all()
    print(f"Checking {len(products)} inventory items for expiration...")

    for p in products:
        # Skip if no expiration date
        if not p.expiration_date:
            continue

        # Skip if already donated
        if p.status == "donated":
            continue

        exp_date = p.expiration_date

        # Ensure exp_date is a date object
        if isinstance(exp_date, datetime):
            exp_date = exp_date.date()
        elif isinstance(exp_date, str):
            try:
                exp_date = datetime.strptime(exp_date, "%Y-%m-%d").date()
            except Exception as e:
                print(f"Error parsing expiration_date for {p.name}: {e}")
                continue

        # Mark expired products as unavailable if not donated
        if exp_date <= today:
            if p.status != "unavailable":
                p.status = "unavailable"
                print(f"Marked {p.name} as unavailable (expired)")
        else:
            # Optional: mark as available if not expired and quantity > 0
            if p.quantity > 0 and p.status == "unavailable":
                p.status = "available"
                print(f"Marked {p.name} as available (not expired)")

    db.commit()
    print("Bakery inventory status sync completed")
