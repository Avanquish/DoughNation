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
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Get bakery_id from either user or employee
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    # To apply the edit on bakery inventory table
    check_inventory_status(db)

    inventory_items = crud.list_inventory(db, bakery_id=bakery_id)
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
    from datetime import datetime, timezone, timedelta
    
    # Philippine Time is UTC+8
    philippine_tz = timezone(timedelta(hours=8))
    today = datetime.now(philippine_tz).date()
    
    bakery_ids_triggered = set()

    # Fetch all bakery products
    products = db.query(models.BakeryInventory).all()
    print(f"[Scheduler] Checking {len(products)} inventory items against threshold...")
    print(f"[Scheduler] Using Philippine date: {today}")

    for p in products:
        exp_date = p.expiration_date
        threshold_days = p.threshold
        
        # Calculate status using the same logic as JavaScript
        # days_until calculation
        if exp_date is None:
            days_remaining = None
        else:
            days_remaining = (exp_date - today).days
        
        # status_of logic
        if days_remaining is None:
            item_status = "fresh"
        elif days_remaining <= 0:  # Changed from < 0 to <= 0
            item_status = "expired"
        elif threshold_days == 0 and days_remaining <= 1:
            item_status = "soon"
        elif days_remaining <= threshold_days:
            item_status = "soon"
        else:
            item_status = "fresh"

        # Remove donations if expired (but keep in inventory)
        if item_status == "expired":
            existing = db.query(models.Donation).filter(
                models.Donation.bakery_inventory_id == p.id
            ).first()
            if existing:
                db.delete(existing)
                print(f"Removed donation for expired product: {p.name} (keeping in inventory)")
            continue

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

        # Only create/update donations for items with "soon" status
        if item_status == "soon":
            if existing:
                existing.quantity = p.quantity
                existing.name = p.name
                existing.image = p.image
                existing.threshold = p.threshold
                existing.creation_date = p.creation_date
                existing.expiration_date = p.expiration_date
                existing.uploaded = p.uploaded
                existing.description = p.description
                print(f"Updated donation for {p.name} (quantity: {p.quantity}, status: {item_status})")
                bakery_ids_triggered.add(p.bakery_id)
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
                    description=p.description
                )
                db.add(donation)
                print(f"Created donation for {p.name} (quantity: {p.quantity}, status: {item_status})")
                bakery_ids_triggered.add(p.bakery_id)
        else:
            # Remove donation if status is not "soon" (fresh or expired)
            if existing:
                db.delete(existing)
                print(f"Removed donation for {p.name} (status: {item_status})")

    db.commit()
    print("[Scheduler] Donation sync completed")

    #  Run geofence only for bakeries that had updates
    for b_id in bakery_ids_triggered:
        print(f"[Scheduler] Running geofence for bakery {b_id}")
        process_geofence_notifications(db, b_id)


def check_inventory_status(db: Session):
    from datetime import datetime, timezone, timedelta
    
    # Philippine Time is UTC+8
    philippine_tz = timezone(timedelta(hours=8))
    today = datetime.now(philippine_tz).date()

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

        # Mark expired products as unavailable (but don't delete from inventory)
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

# For autofill of creation date
@router.get("/server-time")
def get_server_time():
    from datetime import datetime, timezone, timedelta
    # Philippine Time is UTC+8
    philippine_tz = timezone(timedelta(hours=8))
    return {"date": datetime.now(philippine_tz).date().isoformat()}

@router.get("/inventory/template/{product_name}")
def get_product_template(
    product_name: str,
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    """Get product template (shelf life and threshold) for auto-fill"""
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    template = crud.get_product_template(db, bakery_id, product_name)
    
    if template:
        return {
            "exists": True,
            "shelf_life_days": template['shelf_life_days'],
            "threshold": template['threshold'],
            "creation_date": template['creation_date'],  
            "product_name": product_name
        }
    else:
        return {
            "exists": False,
            "product_name": product_name
        } 