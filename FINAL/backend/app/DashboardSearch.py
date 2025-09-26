from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from sqlalchemy import func
from app.models import User
from app import models, database, auth

router = APIRouter()

@router.get("/search_users")
def search_users(
    q: str = Query("", min_length=1),
    target: str = Query("all"),  # "bakeries" | "charities" | "all"
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.User).filter(
        models.User.verified == True,
        models.User.role != "Admin",  # exclude admin
        models.User.id != current_user.id,  # exclude self
        func.lower(models.User.name).like(f"%{q.lower()}%")
    )

    if target == "charities":
        query = query.filter(models.User.role == "Charity")
    elif target == "bakeries":
        query = query.filter(models.User.role == "Bakery")

    results = query.all()

    return [
        {
            "id": u.id,
            "name": f"{u.name} ({u.role})" if u.role in ["Bakery", "Charity"] else u.name,
            "profile_picture": u.profile_picture,
        }
        for u in results
    ]

@router.get("/user/{user_id}")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return only relevant fields
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,  # 'bakery' or 'charity'
        "profile_picture": user.profile_picture,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
