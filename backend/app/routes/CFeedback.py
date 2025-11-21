from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, File
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import ensure_verified_user
import os, shutil
from datetime import datetime
from app.timezone_utils import now_ph

router = APIRouter()
UPLOAD_DIR = "uploads/feedback"

# Make sure the folder exists at startup
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
        if f.media_file:
            fb_dict["media_file_url"] = f"/static/uploads/{f.media_file}"
        else:
            fb_dict["media_file_url"] = None
        result.append(fb_dict)

    return result


# Edit Function for charity
@router.patch("/feedback/charity/{feedback_id}", response_model=schemas.FeedbackRead)
async def edit_feedback(
    feedback_id: int,
    message: str = Form(None),
    rating: int = Form(None),
    media_file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    feedback = db.query(models.Feedback).filter(
        models.Feedback.id == feedback_id,
        models.Feedback.charity_id == current_user.id
    ).first()

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    # Ensure feedback folder exists every time this endpoint is called
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Update message/rating
    if message is not None:
        feedback.message = message
    if rating is not None:
        feedback.rating = rating

    # Handle file upload if present
    if media_file:
        filename = f"{feedback_id}_{now_ph().strftime('%Y%m%d%H%M%S')}_{media_file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(media_file.file, buffer)

        feedback.media_file = f"feedback/{filename}"

    db.commit()
    db.refresh(feedback)
    return feedback
