import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas, database, auth
from app.routes.binventory_routes import check_threshold_and_create_donation

# Define your upload directory
UPLOAD_DIR = "static/uploads/direct_donations"

router = APIRouter()


#  CREATE DIRECT DONATION 
@router.post("/direct", response_model=schemas.DirectDonationResponse)
async def create_direct_donation(
    bakery_inventory_id: int = Form(...),
    charity_id: int = Form(...),
    quantity: int = Form(...),
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user),
):
    # Fetch bakery inventory item
    inventory_item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == bakery_inventory_id
    ).first()
    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # Check target user is charity
    charity_user = db.query(models.User).filter(models.User.id == charity_id).first()
    if not charity_user or charity_user.role.lower() != "charity":
        raise HTTPException(status_code=400, detail="Invalid charity selected")

    # Check if a pending donation request exists for this item
    existing_request = db.query(models.DonationRequest).join(models.Donation).filter(
        models.Donation.bakery_inventory_id == bakery_inventory_id,
        models.DonationRequest.charity_id == charity_id,
        models.DonationRequest.status == "pending"
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="Item already requested for donation")
    

    if quantity > inventory_item.quantity:
        raise HTTPException(status_code=400, detail="Quantity exceeds available inventory")

    # Create DirectDonation record
    direct_donation = models.DirectDonation(
        bakery_inventory_id=inventory_item.id,
        charity_id=charity_id,
        name=inventory_item.name,
        quantity=quantity,
        threshold=inventory_item.threshold,
        creation_date=inventory_item.creation_date,
        expiration_date=inventory_item.expiration_date,
        description=inventory_item.description,
        image=inventory_item.image
    )
    db.add(direct_donation)

    # Reduce inventory quantity
    inventory_item.quantity -= quantity
    if inventory_item.quantity == 0:
        inventory_item.status = "donated"  # mark as fully donated
    else:
        inventory_item.status = "available"

        # Remove from auto-donation if exists
        donation_record = db.query(models.Donation).filter(
            models.Donation.bakery_inventory_id == inventory_item.id
        ).first()
        if donation_record:
            db.delete(donation_record)
            print(f"Removed auto-donation for fully donated item: {inventory_item.name}")

    db.commit()
    # Schedule donation check in background
    check_threshold_and_create_donation(db)

    db.refresh(direct_donation)

    return direct_donation


#  GET DONATIONS FOR LOGGED-IN CHARITY 
@router.get("/direct/mine", response_model=list[schemas.DirectDonationResponse])
def get_my_direct_donations(
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user),
):
    if current_user.role.lower() != "charity":
        raise HTTPException(status_code=403, detail="Not authorized")

    return db.query(models.DirectDonation).filter(
        models.DirectDonation.charity_id == current_user.id
    ).all()


#  GET ALL CHARITIES (FOR DROPDOWN) 
@router.get("/charities", response_model=list[schemas.CharityOut])
def get_charities(db: Session = Depends(database.get_db)):
    charities = db.query(models.User).filter(models.User.role.ilike("Charity")).all()
    return charities



