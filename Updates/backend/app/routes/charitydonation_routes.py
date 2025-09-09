from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import ensure_verified_user
from app.schemas import DonationRequestCreate

from app.routes.binventory_routes import check_threshold_and_create_donation

router = APIRouter()


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

    new_request = models.DonationRequest(
        donation_id=payload.donation_id,
        charity_id=current_user.id,
        bakery_id=payload.bakery_id,
        bakery_inventory_id=donation.bakery_inventory_id,
        timestamp=datetime.utcnow(),
        status="pending"
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    donation_request = db.query(models.DonationRequest).filter(
        models.DonationRequest.donation_id == donation_id,
        models.DonationRequest.bakery_id == current_user.id,
        models.DonationRequest.status == "pending"
    ).first()
    if not donation_request:
        raise HTTPException(status_code=404, detail="Pending donation request not found")

    donation_request.status = "accepted"
    db.commit()

    # Update inventory status
    update_inventory_status(db, donation_request.bakery_inventory_id)

    check_threshold_and_create_donation(db)

    return {"message": "Donation accepted"}