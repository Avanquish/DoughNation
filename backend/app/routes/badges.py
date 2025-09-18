from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, crud
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/badges", tags=["Badges"])

# ---------------- Get All Badges ----------------
@router.get("/", response_model=List[schemas.BadgeResponse])
def get_badges(db: Session = Depends(get_db)):
    return crud.get_all_badges(db)

# ---------------- Get User Badges ----------------
@router.get("/user/{user_id}", response_model=List[schemas.UserBadgeResponse])
def get_user_badges(user_id: int, db: Session = Depends(get_db)):
    return crud.get_user_badges(db, user_id)

# ---------------- Assign Badge (Admin or System) ----------------
@router.post("/assign", response_model=schemas.UserBadgeResponse)
def assign_badge(
    payload: schemas.UserBadgeBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Only admins or system triggers allowed
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign badges")
    
    badge = crud.assign_badge_to_user(db, payload.user_id, payload.badge_id)
    return badge

# ---------------- Update Badge Progress ----------------
@router.post("/progress", response_model=schemas.BadgeProgressResponse)
def update_badge_progress(
    user_id: int,
    badge_id: int,
    increment: int = 1,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Bakery users progress auto-updates via donations
    if current_user.role != "bakery" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only bakeries or admins can update badge progress")