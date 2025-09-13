from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import ensure_verified_user

router = APIRouter()

# Get all feedback submitted by the logged-in charity
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import ensure_verified_user

router = APIRouter()

@router.get("/feedback/charity", response_model=List[schemas.FeedbackRead])
def get_my_feedback(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    if current_user.role.lower() != "charity":
        raise HTTPException(status_code=403, detail="Not authorized")

    feedbacks = (
        db.query(models.Feedback)
        .options(joinedload(models.Feedback.bakery))
        .filter(models.Feedback.charity_id == current_user.id)
        .order_by(models.Feedback.created_at.desc())
        .all()
    )

    result = []
    for f in feedbacks:
        bakery = f.bakery
        fb_dict = f.__dict__.copy()
        fb_dict["bakery_name"] = bakery.name if bakery else "Unknown bakery"
        fb_dict["bakery_profile_picture"] = bakery.profile_picture if bakery else None
        result.append(fb_dict)

    return result

# Edit Function for charity
@router.patch("/feedback/charity/{feedback_id}", response_model=schemas.FeedbackRead)
def edit_feedback(
    feedback_id: int,
    data: schemas.FeedbackUpdate,  # new schema for updates
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    feedback = db.query(models.Feedback).filter(
        models.Feedback.id == feedback_id,
        models.Feedback.charity_id == current_user.id
    ).first()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    if data.message is not None:
        feedback.message = data.message
    if data.rating is not None:
        feedback.rating = data.rating
    
    db.commit()
    db.refresh(feedback)
    return feedback