from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database
from app.auth import get_current_admin  # Only allow admins

router = APIRouter()

@router.get("/pending-users")
def get_pending_users(db: Session = Depends(database.get_db), admin=Depends(get_current_admin)):
    users = db.query(models.User).filter(models.User.verified == False).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "proof_file": u.proof_of_validity  # Include proof file in response
        }
        for u in users
    ]

@router.post("/verify-user/{user_id}")
def verify_user(user_id: int, db: Session = Depends(database.get_db), admin=Depends(get_current_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.verified = True
    db.commit()
    return {"message": f"User {user.name} verified successfully"}

@router.post("/reject-user/{user_id}")
def reject_user(user_id: int, db: Session = Depends(database.get_db), admin=Depends(get_current_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.name} rejected and deleted"}