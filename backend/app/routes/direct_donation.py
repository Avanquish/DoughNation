import os
import shutil
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from app.timezone_utils import now_ph
from sqlalchemy.orm import Session
from sqlalchemy import func, true

from app.database import get_db
from app.auth import get_current_user
from app.models import User 
from app.crud import update_user_badges
from app.auth import get_bakery_id_from_auth, get_donor_name_from_auth

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
    current_auth=Depends(auth.get_current_user_or_employee),
):
    # Extract bakery_id from either employee or bakery token
    bakery_id = get_bakery_id_from_auth(current_auth)
    donated_by = get_donor_name_from_auth(current_auth) 
    
    if not bakery_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
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

    # ✅ Create DirectDonation record WITH donated_by
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
        btracking_status="preparing",
        donated_by=donated_by  # ✅ Store who created the donation
    )
    db.add(direct_donation)

    # Reduce inventory quantity
    inventory_item.quantity -= quantity
    if inventory_item.quantity == 0:
        inventory_item.status = "donated"
    else:
        inventory_item.status = "available"
        donation_record = db.query(models.Donation).filter(
            models.Donation.bakery_inventory_id == inventory_item.id
        ).first()
        if donation_record:
            db.delete(donation_record)
            print(f"Removed auto-donation for fully donated item: {inventory_item.name}")

    db.commit()
    check_threshold_and_create_donation(db)
    db.refresh(direct_donation)

    return direct_donation


@router.get("/direct/bakery", response_model=list[schemas.DirectDonationResponse])
def get_direct_donations_for_bakery(
    db: Session = Depends(database.get_db),
    current_auth=Depends(auth.get_current_user_or_employee),
):
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    if not bakery_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    donations = (
        db.query(models.DirectDonation)
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .all()
    )

    result = []
    for d in donations:
        inventory_item = d.bakery_inventory
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
            "btracking_completed_at": d.btracking_completed_at.isoformat() if d.btracking_completed_at else None,
            "bakery_name": bakery_owner.name if bakery_owner else None,
            "bakery_profile_picture": bakery_owner.profile_picture if bakery_owner else None,
            "charity_name": charity_user.name if charity_user else None,
            "charity_profile_picture": charity_user.profile_picture if charity_user else None,
            "donated_by": d.donated_by,  # ✅ Include donated_by in response
        })

    return result


@router.post("/direct/tracking/{direct_donation_id}")
def update_direct_tracking(
    direct_donation_id: int,
    data: schemas.bTrackingUpdate,
    db: Session = Depends(get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Extract bakery_id from either employee or bakery token
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    if not bakery_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Fetch donation
    donation = db.query(models.DirectDonation).join(models.BakeryInventory).filter(
        models.DirectDonation.id == direct_donation_id,
        models.BakeryInventory.bakery_id == bakery_id  # ownership check
    ).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Direct donation not found")

    # Update direct donation status
    donation.btracking_status = data.btracking_status

    # Auto set timestamp if complete
    if data.btracking_status.lower() == "complete" and not donation.btracking_completed_at:
        donation.btracking_completed_at = date.today()

    db.commit()
    db.refresh(donation)

    # Update all related donation_requests
    if data.btracking_status.lower() == "complete":
        db.query(models.DonationRequest).filter(
            models.DonationRequest.donation_id == direct_donation_id
        ).update({
            "tracking_status": data.btracking_status,
            "tracking_completed_at": now_ph()  # <-- FIX: also stamp request side
        })
    else:
        db.query(models.DonationRequest).filter(
            models.DonationRequest.donation_id == direct_donation_id
        ).update({
            "tracking_status": data.btracking_status
        })

    db.commit()
    
    if data.btracking_status.lower() == "complete":
        update_user_badges(db, bakery_id)

    return donation



#  GET ALL CHARITIES (FOR DROPDOWN) 
@router.get("/charities", response_model=list[schemas.CharityOut])
def get_charities(db: Session = Depends(database.get_db)):
    charities = db.query(models.User).filter(models.User.role.ilike("Charity")).all()
    return charities


@router.get("/donation/requests")
def get_donation_requests(
    db: Session = Depends(get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Extract bakery_id from either employee or bakery token
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    if not bakery_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch all requests for this bakery
    requests = (
        db.query(models.DonationRequest)
        .filter(models.DonationRequest.bakery_id == bakery_id)
        .all()
    )

    # Fetch all inventory IDs that already have accepted requests
    accepted_inventory_ids = {
        r.bakery_inventory_id
        for r in db.query(models.DonationRequest)
        .filter(models.DonationRequest.status == "accepted")
        .all()
    }

    grouped = {}

    for r in requests:
        charity_user = r.charity
        bakery_inv_id = r.bakery_inventory_id

        # ACCEPTED requests (show individually)
        if r.status == "accepted":
            grouped_key = f"accepted_{r.id}"
            grouped[grouped_key] = {
                "id": r.id,
                "donation_id": r.donation_id,
                "status": r.status,
                "tracking_status": r.tracking_status,
                "tracking_completed_at": r.tracking_completed_at,
                "name": r.donation_name,
                "image": r.donation_image,
                "quantity": r.donation_quantity,
                "expiration_date": r.donation_expiration,
                # explicitly include these
                "charity_id": r.charity_id,
                "charity_name": charity_user.name if charity_user else None,
                "charity_profile_picture": charity_user.profile_picture if charity_user else None,
            }

        # PENDING requests (group by bakery_inventory_id)
        elif r.status == "pending" and bakery_inv_id not in accepted_inventory_ids:
            if bakery_inv_id not in grouped:
                grouped[bakery_inv_id] = {
                    "bakery_inventory_id": bakery_inv_id,
                    "donation_id": r.donation_id,
                    "status": "pending",
                    "name": r.donation_name,
                    "image": r.donation_image,
                    "quantity": r.donation_quantity,
                    "expiration_date": r.donation_expiration,
                    "requested_by": [],
                }

            if charity_user:
                grouped[bakery_inv_id]["requested_by"].append({
                    "name": charity_user.name,
                    "profile_picture": charity_user.profile_picture
                })

    return list(grouped.values())

@router.post("/donation/tracking/{request_id}")
def update_tracking_status(
    request_id: int,
    data: schemas.TrackingUpdate,  # use Pydantic schema here
    db: Session = Depends(get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Extract bakery_id from either employee or bakery token
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    if not bakery_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    donation_request = db.query(models.DonationRequest).filter(
        models.DonationRequest.id == request_id,
        models.DonationRequest.bakery_id == bakery_id
    ).first()
    if not donation_request:
        raise HTTPException(status_code=404, detail="Donation request not found")

    donation_request.tracking_status = data.tracking_status

    if data.tracking_status.lower() == "complete" and not donation_request.tracking_completed_at:
        donation_request.tracking_completed_at = date.today()

    db.commit()
    db.refresh(donation_request)
    
    if data.tracking_status.lower() == "complete":
        update_user_badges(db, bakery_id)
    
    return donation_request

@router.get("/charities/recommended")
def get_recommended_charities(
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    """
    Recommend charities for a bakery based on transaction activity.
    - Recommended: Charities with <5 total transactions (direct + accepted requests)
    - If all have >=5, recommended = 3 least active ones
    - Always include all charities (so frontend can show 'Other Charities')
    """
    # Extract bakery_id from either employee or bakery token
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    if not bakery_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Count accepted donation requests per charity
    request_counts = (
        db.query(
            models.DonationRequest.charity_id,
            func.count(models.DonationRequest.id).label("count")
        )
        .filter(
            models.DonationRequest.bakery_id == bakery_id,
            models.DonationRequest.status == "accepted"
        )
        .group_by(models.DonationRequest.charity_id)
        .all()
    )

    # Count direct donations per charity
    direct_counts = (
        db.query(
            models.DirectDonation.charity_id,
            func.count(models.DirectDonation.id).label("count")
        )
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .group_by(models.DirectDonation.charity_id)
        .all()
    )

    # Merge counts into total_counts
    total_counts = {}
    for row in request_counts:
        total_counts[row.charity_id] = total_counts.get(row.charity_id, 0) + row.count
    for row in direct_counts:
        total_counts[row.charity_id] = total_counts.get(row.charity_id, 0) + row.count

    # Fetch all active charities
    charities = db.query(models.User).filter(models.User.role.ilike("charity"), models.User.verified==True)

    # Determine which are recommended
    all_have_5plus = all(total_counts.get(c.id, 0) >= 5 for c in charities) if charities else False

    if all_have_5plus:
        # All have high activity → pick 3 least active
        sorted_charities = sorted(charities, key=lambda c: total_counts.get(c.id, 0))
        recommended = sorted_charities[:3]
    else:
        # Recommended are those with <5 transactions
        recommended = [c for c in charities if total_counts.get(c.id, 0) < 5]

    # The rest (non-recommended)
    recommended_ids = {c.id for c in recommended}
    rest = [c for c in charities if c.id not in recommended_ids]

    # Response format
    def charity_data(c):
        return {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "contact_person": c.contact_person,
            "contact_number": c.contact_number,
            "address": c.address,
            "profile_picture": c.profile_picture,
            "transaction_count": total_counts.get(c.id, 0)
        }

    return {
        "recommended": [charity_data(c) for c in recommended],
        "rest": [charity_data(c) for c in rest],
        "all": [charity_data(c) for c in charities]  # Optional: full list
    } 