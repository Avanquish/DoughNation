# app/routes/charitydonation_routes.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import ensure_verified_user

router = APIRouter()

@router.get("/available", response_model=List[schemas.DonationRead])
def get_available_donations(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    today = date.today()
    donations = (
        db.query(models.Donation, models.User.name.label("bakery_name"))
        .join(models.User, models.User.id == models.Donation.bakery_id)
        .filter(models.Donation.quantity > 0)
        .filter((models.Donation.expiration_date == None) | (models.Donation.expiration_date >= today))
        .all()
    )

    donation_list = []
    for donation, bakery_name in donations:
        donation_dict = donation.__dict__.copy()
        donation_dict["bakery_name"] = bakery_name

        # Fix image path → full URL
        if donation.image:
            filename = donation.image.split("/")[-1]
            donation_dict["image"] = f"{request.base_url}uploads/{filename}"

        donation_list.append(schemas.DonationRead(**donation_dict))

    return donation_list