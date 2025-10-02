from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, crud, database
from app.database import get_db
from app.auth import get_current_admin, get_current_user

router = APIRouter(prefix="/badges", tags=["Badges"])

# ---------------- Get All Badges ----------------
@router.get("/", response_model=List[schemas.BadgeResponse])
def get_badges(db: Session = Depends(get_db)):
    return crud.get_all_badges(db)

# ---------------- Get All Bakery Users ----------------
@router.get("/bakery-users")
def get_bakery_users(db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.role == "Bakery").all()

# ---------------- Get Admin Badges ----------------
@router.get("/admin-badge", response_model=List[schemas.BadgeResponse])
def get_admin_badges(db: Session = Depends(get_db)):
    return crud.get_admin_badges(db)

# ---------------- Get User Badges ----------------
@router.get("/user/{user_id}", response_model=List[schemas.UserBadgeResponse])
def get_user_badges(user_id: int, db: Session = Depends(get_db)):
    return crud.get_user_badges(db, user_id)

# ---------------- Get User Badge Progress ----------------
@router.get("/progress/{user_id}", response_model=List[schemas.BadgeProgressResponse])
def get_user_badge_progress(user_id: int, db: Session = Depends(get_db)):
    # Fetch all badges
    badges = db.query(models.Badge).all()

    # Fetch user's existing progress
    user_progress = db.query(models.BadgeProgress).filter_by(user_id=user_id).all()
    progress_dict = {p.badge_id: p for p in user_progress}

    result = []
    for badge in badges:
        bp = progress_dict.get(badge.id)

        # Determine target from badge threshold or default to 1
        target = getattr(badge, "target", 1)

        result.append(
            schemas.BadgeProgressResponse(
                id=bp.id if bp else 0,  # 0 if no progress yet
                user_id=user_id,
                badge_id=badge.id,
                progress=bp.progress if bp else 0,
                target=target
            )
        )
    return result

# ---------------- Assign Badge (Admin) ----------------
@router.post("/assign", response_model=schemas.UserBadgeResponse)
def assign_badge(
    payload: schemas.UserBadgeBase,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(get_current_admin)  # Only admins
):
    # Ensure user exists
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Ensure badge exists
    badge = db.query(models.Badge).filter(models.Badge.id == payload.badge_id).first()
    if not badge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Badge not found")

    # Assign badge
    # Assign badge to user
    user_with_badge = crud.assign_badge_to_user(
        db, 
        payload.user_id, 
        payload.badge_id, 
        payload.badge_name,
        payload.description
    )

    if not user_with_badge:
        raise HTTPException(status_code=404, detail="User not found")

    return user_with_badge  # ✅ return the updated user with badges

# ---------------- Update Badge Progress ----------------
@router.post("/progress", response_model=schemas.BadgeProgressResponse)
def update_badge_progress(
    user_id: int,
    badge_id: int,
    increment: int = 1,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Only bakeries or admins can update progress
    if current_user.role not in ["bakery", "admin"]:
        raise HTTPException(status_code=403, detail="Only bakeries or admins can update badge progress")

    # Fetch badge info to get target (threshold)
    badge = db.query(models.Badge).filter_by(id=badge_id).first()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")

    target = getattr(badge, "target", 1)  # Make sure your badges have a target column

    # Fetch existing progress
    badge_progress = db.query(models.BadgeProgress).filter_by(user_id=user_id, badge_id=badge_id).first()

    if badge_progress:
        # Increment progress but cap at the badge target
        badge_progress.progress = min(badge_progress.progress + increment, target)
    else:
        # Create new progress record
        badge_progress = models.BadgeProgress(
            user_id=user_id,
            badge_id=badge_id,
            progress=min(increment, target),
            target=target
        )
        db.add(badge_progress)

    db.commit()
    db.refresh(badge_progress)

    return badge_progress