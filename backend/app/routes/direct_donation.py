import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.models import User 


from app import models, schemas, database, auth
from app.routes.binventory_routes import check_threshold_and_create_donation
from app.crud import update_badges_after_donation

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
        image=inventory_item.image,
        btracking_status="preparing"
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


@router.get("/direct/bakery", response_model=list[schemas.DirectDonationResponse])
def get_direct_donations_for_bakery(
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user),
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Only get donations where the inventory belongs to the current bakery
    donations = (
        db.query(models.DirectDonation)
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == current_user.id)
        .all()
    )

    result = []
    for d in donations:
        inventory_item = d.bakery_inventory  # already available via relationship
        bakery_owner = d.bakery_inventory.bakery if inventory_item else None
        charity_user = d.charity 
        
        result.append({
            "id": d.id,
            "donation_id": d.id,
            "name": d.name,
            "quantity": d.quantity,
            "threshold": d.threshold,
            "creation_date": d.creation_date.isoformat() if d.creation_date else None,
            "expiration_date": d.expiration_date.isoformat() if d.expiration_date else None,
            "description": d.description,
            "bakery_inventory_id": d.bakery_inventory_id,
            "charity_id": d.charity_id,
            "image": d.image,
            "btracking_status": d.btracking_status or "preparing",
            "bakery_name": bakery_owner.name if bakery_owner else None,
            "bakery_profile_picture": bakery_owner.profile_picture if bakery_owner else None,
            "charity_name": charity_user.name if charity_user else None,
            "charity_profile_picture": charity_user.profile_picture if charity_user else None,
        })

    return result


@router.post("/direct/tracking/{direct_donation_id}")
def update_direct_tracking(
    direct_donation_id: int,
    data: schemas.bTrackingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Fetch donation
    donation = db.query(models.DirectDonation).join(models.BakeryInventory).filter(
        models.DirectDonation.id == direct_donation_id,
        models.BakeryInventory.bakery_id == current_user.id  # ownership check
    ).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Direct donation not found")

    # Update direct donation status
    donation.btracking_status = data.btracking_status
    db.commit()
    db.refresh(donation)

    # Update all related donation_requests
    db.query(models.DonationRequest).filter(
        models.DonationRequest.donation_id == direct_donation_id
    ).update({"tracking_status": data.btracking_status}) 
    db.commit()

    return donation


#  GET ALL CHARITIES (FOR DROPDOWN) 
@router.get("/charities", response_model=list[schemas.CharityOut])
def get_charities(db: Session = Depends(database.get_db)):
    charities = db.query(models.User).filter(models.User.role.ilike("Charity")).all()
    return charities


@router.get("/donation/requests")
def get_donation_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch all requests for this bakery
    requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_id == current_user.id
    ).all()

    # Fetch all bakery_inventory_ids that already have an accepted request
    accepted_inventory_ids = {
        r.bakery_inventory_id
        for r in db.query(models.DonationRequest).filter(
            models.DonationRequest.status == "accepted"
        ).all()
    }

    # Build result
    result = []
    for r in requests:
        charity_user = r.charity 
        if r.status == "accepted":
            # Always show accepted
            result.append({
                "id": r.id,
                "donation_id": r.donation_id,
                "status": r.status,
                "tracking_status": r.tracking_status,
                "charity_id": r.charity_id,
                "charity_name": getattr(r, "charity_name", None),   # if you store it
                "name": r.donation_name,
                "image": r.donation_image,
                "quantity": r.donation_quantity,
                "expiration_date": r.donation_expiration,
                "charity_name": charity_user.name if charity_user else None,
                "charity_profile_picture": charity_user.profile_picture if charity_user else None,
            })
        elif r.status == "pending" and r.bakery_inventory_id not in accepted_inventory_ids:
            # Show pending if no one accepted yet
            result.append({
                "id": r.id,
                "donation_id": r.donation_id,
                "status": r.status,
                "charity_id": r.charity_id,
                "charity_name": getattr(r, "charity_name", None),
                "name": r.donation_name,
                "image": r.donation_image,
                "quantity": r.donation_quantity,
                "expiration_date": r.donation_expiration,
            })
        # Ignore canceled

    return result

# ---------------------- UPDATE TRACKING STATUS ----------------------
@router.post("/tracking/{donation_type}/{donation_id}")
def update_tracking_status(
    donation_type: str,  # "direct" or "request"
    donation_id: int,
    data: schemas.TrackingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update tracking status of a donation (direct or request) and update badges if completed.
    """
    if donation_type.lower() == "direct":
        donation = (
            db.query(models.DirectDonation)
            .join(models.BakeryInventory)
            .filter(
                models.DirectDonation.id == donation_id,
                models.BakeryInventory.bakery_id == current_user.id
            )
            .first()
        )
        if not donation:
            raise HTTPException(status_code=404, detail="Direct donation not found")

        donation.btracking_status = data.btracking_status
        quantity = donation.quantity

        # Update related donation requests
        db.query(models.DonationRequest).filter(
            models.DonationRequest.donation_id == donation_id
        ).update({"tracking_status": data.btracking_status})

    elif donation_type.lower() == "request":
        donation = db.query(models.DonationRequest).filter(
            models.DonationRequest.id == donation_id,
            models.DonationRequest.bakery_id == current_user.id
        ).first()
        if not donation:
            raise HTTPException(status_code=404, detail="Donation request not found")

        donation.tracking_status = data.tracking_status
        quantity = donation.donation_quantity or 1
    else:
        raise HTTPException(status_code=400, detail="Invalid donation type")

    db.commit()
    db.refresh(donation)

    # ------------------ UNLOCK BADGES IF COMPLETED ------------------
    if data.tracking_status.lower() == "completed":
        update_badges_after_donation(
            db=db,
            user_id=current_user.id,
            donation_type=donation_type.lower(),
            quantity=quantity
        )

    return donation