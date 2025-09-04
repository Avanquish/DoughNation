from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import ensure_verified_user
from app.schemas import DonationRequestCreate

router = APIRouter()

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

# Request a donation
@router.post("/donation/request")
def request_donation(
    payload: DonationRequestCreate,  
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    donation_id = payload.donation_id
    bakery_id = payload.bakery_id

    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.quantity <= 0:
        raise HTTPException(status_code=400, detail="Donation not available")

    # Check if there is already a pending request for this donation by this charity
    existing_request = db.query(models.DonationRequest).filter(
        models.DonationRequest.charity_id == current_user.id,
        models.DonationRequest.donation_id == donation_id,
        models.DonationRequest.status == "pending"
    ).first()

    if existing_request:
        raise HTTPException(status_code=400, detail="You have already requested this donation")

    new_request = models.DonationRequest(
        donation_id=donation_id,
        charity_id=current_user.id,
        bakery_id=bakery_id,
        timestamp=datetime.utcnow(),
        status="pending"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return {"message": "Donation request sent", "request_id": new_request.id}


# Cancel a donation request
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
    return {"message": "Donation request canceled"}


# Fetch current charity's active requests
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