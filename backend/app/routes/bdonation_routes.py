from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app import models, database, schemas, auth, crud

router = APIRouter()

# ------------------ LIST EMPLOYEES ------------------
@router.get("/donations", response_model=List[schemas.DonationBase])
def get_donations(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can view donation")

    donations = crud.list_donations(db, bakery_id=current_user.id)

    for donation in donations:
        if donation.image and donation.image.startswith("uploads/"):
            donation.image = donation.image.replace("uploads/", "")
            
    return donations