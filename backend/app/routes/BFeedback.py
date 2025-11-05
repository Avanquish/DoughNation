from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, Form, File
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import ensure_verified_user
import os, shutil
from datetime import datetime

router = APIRouter()
UPLOAD_DIR = "uploads/feedback"

@router.get("/feedback/bakery", response_model=List[schemas.FeedbackRead])
def get_my_feedback(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Not authorized")

    feedbacks = (
        db.query(models.Feedback)
        .options(joinedload(models.Feedback.charity))
        .filter(models.Feedback.bakery_id == current_user.id)
        .order_by(models.Feedback.created_at.desc())
        .all()
    )

    result = []
    for f in feedbacks:
        charity = f.charity
        fb_dict = f.__dict__.copy()
        fb_dict["charity_name"] = charity.name if charity else "Unknown charity"
        fb_dict["charity_profile_picture"] = charity.profile_picture if charity else None
        if f.media_file:
           fb_dict["media_file_url"] = f"/static/uploads/{f.media_file}"
        else:
            fb_dict["media_file_url"] = None
        result.append(fb_dict)

    return result

@router.patch("/feedback/bakery/{feedback_id}", response_model=schemas.FeedbackRead)
async def reply_feedback(
    feedback_id: int,
    reply_message: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Not authorized")

    feedback = db.query(models.Feedback).filter(
        models.Feedback.id == feedback_id,
        models.Feedback.bakery_id == current_user.id
    ).first()

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    feedback.reply_message = reply_message
    db.commit()
    db.refresh(feedback)

    return feedback