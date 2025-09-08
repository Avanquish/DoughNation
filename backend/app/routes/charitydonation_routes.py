from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.database import get_db
from app import models, schemas, crud
from app.auth import ensure_verified_user
from app.schemas import DonationRequestCreate

router = APIRouter(prefix="/donations", tags=["donations"])


# ------------------ GET AVAILABLE DONATIONS ------------------
@router.get("/available", response_model=List[schemas.DonationRead])
def get_available_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    donations = (
        db.query(models.Donation, models.User, models.BakeryInventory)
        .join(models.User, models.User.id == models.Donation.bakery_id)
        .join(models.BakeryInventory, models.BakeryInventory.id == models.Donation.bakery_inventory_id)
        .filter(models.Donation.status == "available")
        .filter(models.Donation.quantity > 0)
        .all()
    )

    donation_list = []
    for donation, bakery, inventory in donations:
        donation_dict = donation.__dict__.copy()
        donation_dict["bakery_name"] = bakery.name
        donation_dict["bakery_profile_picture"] = bakery.profile_picture
        donation_dict["freshness"] = crud.compute_freshness(donation)

        donation_list.append(schemas.DonationRead(**donation_dict))

    return donation_list


# ------------------ REQUEST DONATION ------------------
@router.post("/request")
def request_donation(
    payload: DonationRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    donation = db.query(models.Donation).filter(models.Donation.id == payload.donation_id).first()
    if not donation or donation.status != "available" or donation.quantity <= 0:
        raise HTTPException(status_code=400, detail="Donation not available")

    # Prevent duplicate pending request
    existing_request = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id,
        models.DonationRequest.donation_id == payload.donation_id,
        models.DonationRequest.status == "pending"
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="You already requested this donation")

    new_request = models.DonationRequest(
        donation_id=donation.id,
        charity_id=current_user.id,
        bakery_id=payload.bakery_id,
        timestamp=datetime.utcnow(),
        status="pending"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return {"message": "Donation request sent", "request_id": new_request.id}


# ------------------ CANCEL REQUEST ------------------
@router.post("/cancel/{request_id}")
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

    # cancel request
    request_obj.status = "canceled"

    db.commit()
    return {"message": "Donation request canceled"}


# ------------------ GET ALL AVAILABLE DONATION ------------------
@router.get("/requests", response_model=List[schemas.DonationRead])
def requested_donations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    donations = (
        db.query(models.Donation, models.User, models.DonationRequest)
        .join(models.User, models.User.id == models.Donation.bakery_id)
        .join(models.DonationRequest, models.DonationRequest.donation_id == models.Donation.id)
        .filter(models.DonationRequest.charity_id == current_user.id)
        .filter(models.DonationRequest.status.in_(["pending", "confirmed"]))
        .all()
    )

    donation_list = []
    for donation, bakery, request in donations:
        donation_dict = donation.__dict__.copy()
        donation_dict["bakery_name"] = bakery.name
        donation_dict["bakery_profile_picture"] = bakery.profile_picture
        donation_dict["freshness"] = crud.compute_freshness(donation)
        donation_dict["request_status"] = request.status

        donation_list.append(schemas.DonationRead(**donation_dict))

    return donation_list

# ------------------ GET REQUESTED AVAILABLE DONATION ------------------

