from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Body
from sqlalchemy.orm import Session, joinedload
from datetime import date, datetime
from typing import List, Optional
from app.database import get_db
from app import models, schemas, database, auth
from app.auth import ensure_verified_user
from app.schemas import DonationRequestCreate
from app.models import DonationCardChecking

import os

from app.routes.binventory_routes import check_threshold_and_create_donation
from app.crud import update_user_badges

router = APIRouter()
UPLOAD_DIR = "uploads/feedback"


def update_inventory_status(db: Session, inventory_id: int):
    """Update bakery inventory status based on all related donation requests."""
    inventory_item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == inventory_id
    ).first()
    if not inventory_item:
        return

    requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == inventory_id
    ).all()

    if any(r.status == "accepted" for r in requests):
        inventory_item.status = "donated"
    elif any(r.status == "pending" for r in requests):
        inventory_item.status = "requested"
    else:
        inventory_item.status = "available"

    db.commit()
    db.refresh(inventory_item)


@router.get("/available", response_model=List[schemas.DonationRead])
def get_available_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    today = date.today()
    donations = (
        db.query(models.Donation, models.User)
        .join(models.User, models.User.id == models.Donation.bakery_id)
        .filter(models.Donation.quantity > 0)
        .filter((models.Donation.expiration_date == None) | (models.Donation.expiration_date >= today))
        .all()
    )

    donation_list = []
    for donation, bakery in donations:
        donation_dict = donation.__dict__.copy()
        donation_dict["bakery_name"] = bakery.name
        donation_dict["bakery_profile_picture"] = bakery.profile_picture 
        if donation_dict.get("image"):
            donation_dict["image"] = donation_dict["image"]  
        donation_list.append(schemas.DonationRead(**donation_dict))

    return donation_list


@router.post("/donation/request")
def request_donation(
    payload: DonationRequestCreate,  
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    # Check if charity has 3+ donations without feedback
    pending_feedback_normal = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id,
        models.DonationRequest.status == "accepted",
        models.DonationRequest.tracking_status != "complete",
        models.DonationRequest.feedback_submitted.is_(False)
    ).count()

    pending_feedback_direct = db.query(models.DirectDonation).filter(
        models.DirectDonation.charity_id == current_user.id,
        models.DirectDonation.btracking_status != "complete",   # make sure column name matches!
        models.DirectDonation.feedback_submitted.is_(False)
    ).count()

    total_not_complete = pending_feedback_normal + pending_feedback_direct

    if total_not_complete >= 3:
        raise HTTPException(
            status_code=400,
            detail=f"You have {total_not_complete} donations not complete. Please complete :)"
        )
    
    donation = db.query(models.Donation).filter(models.Donation.id == payload.donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.quantity <= 0:
        raise HTTPException(status_code=400, detail="Donation not available")

    existing_request = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id,
        models.DonationRequest.donation_id == payload.donation_id,
        models.DonationRequest.status == "pending"
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="You have already requested this donation")

    # Fetch bakery info
    bakery = db.query(models.User).filter(models.User.id == payload.bakery_id).first()
    if not bakery:
        raise HTTPException(status_code=404, detail="Bakery not found")

    new_request = models.DonationRequest(
        donation_id=payload.donation_id,
        charity_id=current_user.id,
        bakery_id=payload.bakery_id,
        bakery_inventory_id=donation.bakery_inventory_id,
        timestamp=datetime.utcnow(),
        status="pending",
        # New fields to store extra info
        bakery_name=bakery.name,
        bakery_profile_picture=bakery.profile_picture,
        donation_name=donation.name,
        donation_image=donation.image,
        donation_quantity=donation.quantity,
        donation_expiration=donation.expiration_date
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # Update inventory status
    update_inventory_status(db, donation.bakery_inventory_id)

    return {"message": "Donation request sent", "request_id": new_request.id}


@router.post("/donation/cancel/{request_id}")
def cancel_donation_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    request_obj = db.query(models.DonationRequest).filter(
        models.DonationRequest.id == request_id,
        models.DonationRequest.charity_id == current_user.id
    ).first()
    if not request_obj or request_obj.status != "pending":
        raise HTTPException(status_code=404, detail="Pending request not found")

    request_obj.status = "canceled"
    db.commit()

    # Update inventory status
    update_inventory_status(db, request_obj.bakery_inventory_id)

    return {"message": "Donation request canceled"}


@router.get("/donation/my_requests", response_model=List[schemas.DonationRequestRead])
def my_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id,
        models.DonationRequest.status == "pending"
    ).all()
    return requests

@router.post("/donation/accept/{donation_id}")
def accept_donation(
    donation_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    charity_id = payload.get("charity_id")
    if not charity_id:
        raise HTTPException(status_code=400, detail="charity_id required")

    # Find the correct pending donation request
    donation_request = db.query(models.DonationRequest).filter(
        models.DonationRequest.donation_id == donation_id,
        models.DonationRequest.bakery_id == current_user.id,
        models.DonationRequest.charity_id == charity_id,
        models.DonationRequest.status == "pending"
    ).first()

    if not donation_request:
        raise HTTPException(status_code=404, detail="Pending donation request not found")

    # ✅ Accept the request
    donation_request.status = "accepted"

    # ✅ Save record to DonationsCardChecking
    new_check = models.DonationCardChecking(
        donor_id=donation_request.bakery_id,
        recipient_id=donation_request.charity_id,
        donation_request_id=donation_request.id,
        status="accepted"
    )
    db.add(new_check)

    # ❌ Cancel all other requests for same product
    other_requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_inventory_id == donation_request.bakery_inventory_id,
        models.DonationRequest.id != donation_request.id,
        models.DonationRequest.status == "pending"
    ).all()
    canceled_charity_ids = []
    for r in other_requests:
        r.status = "canceled"
        canceled_charity_ids.append(r.charity_id)

    # ✅ Commit everything once
    db.commit()

    # 🔄 Update inventory
    update_inventory_status(db, donation_request.bakery_inventory_id)
    check_threshold_and_create_donation(db)

    return {
        "message": "Donation accepted and others canceled",
        "accepted_charity_id": donation_request.charity_id,
        "canceled_charities": canceled_charity_ids,
        "donation_id": donation_id,
        "donation_name": donation_request.donation_name
    }

@router.get("/donation/received")
def received_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    if current_user.role.lower() != "charity":
        raise HTTPException(status_code=403, detail="Not authorized")

    requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id
    ).all()

    result = []
    for r in requests:
        if r.status in ["accepted", "pending"]:
            # Fetch bakery info
            donation_inventory = db.query(models.BakeryInventory).filter(
                models.BakeryInventory.id == r.bakery_inventory_id
            ).first()
            bakery = db.query(models.User).filter(
                models.User.id == donation_inventory.bakery_id
            ).first() if donation_inventory else None

            result.append({
                "id": r.id,
                "donation_id": r.donation_id,
                "status": r.status,
                "tracking_status": r.tracking_status,
                "tracking_completed_at": r. tracking_completed_at,
                "feedback_submitted": r.feedback_submitted,
                "name": r.donation_name,
                "image": r.donation_image,
                "quantity": r.donation_quantity,
                "expiration_date": r.donation_expiration,
                "bakery_name": bakery.name if bakery else "Unknown bakery",
                "bakery_profile_picture": bakery.profile_picture if bakery else None
            })

    return result

@router.post("/donation/received/{request_id}")
def mark_received(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    request_obj = db.query(models.DonationRequest).filter(
        models.DonationRequest.id == request_id,
        models.DonationRequest.charity_id == current_user.id
    ).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Donation request not found")

    if request_obj.tracking_status != "in_transit":
        raise HTTPException(status_code=400, detail="Donation not ready to be received")

    request_obj.tracking_status = "received"  # Mark as received
    db.commit()
    db.refresh(request_obj)
    return {"message": "Donation marked as received"}


@router.post("/donation/feedback/{request_id}")
async def submit_feedback(
    request_id: int,
    message: str = Form(...),
    rating: int = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    request_obj = db.query(models.DonationRequest).filter(
        models.DonationRequest.id == request_id,
        models.DonationRequest.charity_id == current_user.id
    ).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Donation request not found")

    # create feedback first
    feedback = models.Feedback(
        donation_request_id=request_obj.id,
        charity_id=current_user.id,
        bakery_id=request_obj.bakery_id,
        message=message,
        rating=rating,
        product_name=request_obj.donation_name,
        product_quantity=request_obj.donation_quantity,
        product_image=request_obj.donation_image
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    saved_files = []
    if files:
        for file in files:
            # use feedback.id + timestamp for uniqueness
            filename = f"{feedback.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, filename)

            with open(file_path, "wb") as f:
                f.write(await file.read())

            saved_files.append(f"feedback/{filename}")

        # join all files as CSV, or store in JSON if you prefer
        feedback.media_file = ",".join(saved_files)

        db.commit()
        db.refresh(feedback)

    # Update donation request
    request_obj.feedback_submitted = True
    request_obj.tracking_status = "complete"
    if not request_obj.tracking_completed_at: 
        request_obj.tracking_completed_at = date.today()
    db.commit()
    db.refresh(request_obj)

    update_user_badges(db, request_obj.bakery_id)

    return {"message": "Feedback submitted and donation marked complete"}


#  GET DONATIONS FOR LOGGED-IN CHARITY 
@router.get("/direct/mine", response_model=List[schemas.DirectDonationResponse])
def get_my_direct_donations(
    db: Session = Depends(get_db),
    current_user=Depends(ensure_verified_user),
):
    if current_user.role.lower() != "charity":
        raise HTTPException(status_code=403, detail="Not authorized")

    donations = db.query(models.DirectDonation).filter(
        models.DirectDonation.charity_id == current_user.id
    ).all()

    result = []
    for d in donations:
        bakery_inventory = db.query(models.BakeryInventory).filter(
            models.BakeryInventory.id == d.bakery_inventory_id
        ).first()
        bakery = db.query(models.User).filter(
            models.User.id == bakery_inventory.bakery_id
        ).first() if bakery_inventory else None

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
            "btracking_status": d.btracking_status,
            "btracking_completed_at": d.btracking_completed_at.isoformat() if d.btracking_completed_at else None,
            "feedback_submitted": d.feedback_submitted or False,
            "bakery_name": bakery.name if bakery else "Unknown bakery",
            "bakery_profile_picture": bakery.profile_picture if bakery else None
        })

    return result


@router.post("/direct/received/{direct_donation_id}")
def mark_direct_received(
    direct_donation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user)
):
    donation = db.query(models.DirectDonation).filter(
        models.DirectDonation.id == direct_donation_id,
        models.DirectDonation.charity_id == current_user.id
    ).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Direct donation not found")

    # Use btracking_status instead of tracking_status
    if donation.btracking_status not in ["in_transit", "preparing"]:
        raise HTTPException(status_code=400, detail="Donation not ready to be received")

    donation.btracking_status = "received"
    db.commit()
    db.refresh(donation)

    return {"message": "Direct donation marked as received"}

@router.post("/direct/feedback/{direct_donation_id}")
async def submit_direct_feedback(
    direct_donation_id: int,
    message: str = Form(...),
    rating: int = Form(...),
    files: Optional[List[UploadFile]] = File(None),   # multiple files
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user)
):
    donation = db.query(models.DirectDonation).filter(
        models.DirectDonation.id == direct_donation_id,
        models.DirectDonation.charity_id == current_user.id
    ).first()

    if not donation:
        raise HTTPException(status_code=404, detail="Direct donation not found")

    if not donation.bakery_inventory:
        raise HTTPException(status_code=400, detail="Direct donation is missing bakery inventory")

    # Create feedback first so we have an ID
    feedback = models.Feedback(
        direct_donation_id=donation.id,
        charity_id=current_user.id,
        bakery_id=donation.bakery_inventory.bakery_id,
        message=message,
        rating=rating,
        product_name=donation.name,
        product_quantity=donation.quantity,
        product_image=donation.image
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    # Save uploaded files
    saved_files = []
    if files:
        for file in files:
            filename = f"{feedback.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, filename)

            with open(file_path, "wb") as f:
                f.write(await file.read())

            saved_files.append(f"feedback/{filename}")

        # store all file paths (comma-separated)
        feedback.media_file = ",".join(saved_files)
        db.commit()
        db.refresh(feedback)

    # Update donation status
    donation.feedback_submitted = True
    donation.btracking_status = "complete"
    if not donation.btracking_completed_at: 
        donation.btracking_completed_at = date.today()
    db.commit()
    db.refresh(donation)

    update_user_badges(db, donation.bakery_inventory.bakery_id)

    return {"message": "Feedback submitted successfully"}

#===============================================================

@router.get("/donation/accepted")
def get_accepted_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    query = db.query(models.DonationRequest).filter(
        models.DonationRequest.status.in_(["canceled", "accepted"])
    )

    if current_user.role.lower() == "charity":
        query = query.filter(models.DonationRequest.charity_id == current_user.id)
    elif current_user.role.lower() == "bakery":
        query = query.filter(models.DonationRequest.bakery_id == current_user.id)
    else:
        raise HTTPException(status_code=403, detail="Invalid user role")

    requests = query.all()

    return [
        {
            "id": r.id,
            "donation_id": r.donation_id,
            "status": r.status,
            "bakery_inventory_id": r.bakery_inventory_id,
            "charity_id": r.charity_id,
            "donation_name": r.donation_name,
            "donation_image": r.donation_image,
        }
        for r in requests
    ]





