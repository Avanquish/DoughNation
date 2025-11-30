from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app import models, database, schemas, auth, crud

router = APIRouter()

# ------------------ Bakery Donation ------------------
@router.get("/donations", response_model=List[schemas.DonationBase])
def get_donations(
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Get bakery_id from either user or employee
    bakery_id = auth.get_bakery_id_from_auth(current_auth)

    donations = crud.list_donations(db, bakery_id=bakery_id)

    for donation in donations:
        if donation.image and donation.image.startswith("uploads/bakery_inventory/"):
            donation.image = donation.image.replace("uploads/", "")
            
    return donations