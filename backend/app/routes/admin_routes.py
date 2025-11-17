from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app import models, database
from app.auth import get_current_admin  # Only allow admins
from app.email_utils import send_account_verified_email  # ✅ NEW: Import email function

router = APIRouter(prefix="/admin", tags=["Admin"])

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
    """
    Verify a user account (admin approval)
    
    ✅ Sets user status to Active upon verification
    ✅ Sends email notification to user when account is verified
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mark as verified and set status to Active
    user.verified = True
    user.status = "Active"
    db.commit()
    
    # ✅ NEW: Send verification email to user
    try:
        send_account_verified_email(user.email, user.name, user.role)
        print(f"✅ Verification email sent to {user.email}")
    except Exception as e:
        print(f"⚠️  Failed to send verification email: {str(e)}")
        # Don't fail the verification if email fails
    
    return {"message": f"User {user.name} verified successfully and notified via email"}

@router.post("/reject-user/{user_id}")
def reject_user(user_id: int, db: Session = Depends(database.get_db), admin=Depends(get_current_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.name} rejected and deleted"}

@router.get("/all-users")
def get_users(db: Session = Depends(database.get_db)):
    return db.query(models.User).filter(models.User.role != "Admin").all()

@router.get("/bakeries")
def get_bakeries(db: Session = Depends(database.get_db), admin=Depends(get_current_admin)):
    """
    Get all bakery users
    Requires admin authentication
    """
    bakeries = db.query(models.User).filter(models.User.role == "Bakery").all()
    return bakeries

@router.get("/charities")
def get_charities(db: Session = Depends(database.get_db), admin=Depends(get_current_admin)):
    """
    Get all charity users
    Requires admin authentication
    """
    charities = db.query(models.User).filter(models.User.role == "Charity").all()
    return charities

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/complaints")
def get_pending_complaints(
    db: Session = Depends(database.get_db),
    admin=Depends(get_current_admin)  # restrict to admins
):
    complaints = (
        db.query(models.Complaint)
        .filter(models.Complaint.status == "Pending")
        .all()
    )

    return [
        {
            "id": c.id,
            "subject": c.subject,
            "description": c.description,
            "status": c.status,
            "created_at": c.created_at,
            "user_id": c.user_id,
            "user_name": c.user.name if c.user else None,
            "user_role": c.user.role if c.user else None,
        }
        for c in complaints
    ]

@router.post("/notifications/mark-read/{notif_id}")
def mark_notification_as_read(
    notif_id: str,
    db: Session = Depends(database.get_db),
    admin=Depends(get_current_admin)  # only admins mark as read
):
    # Check if already marked
    existing = (
        db.query(models.NotificationRead)
        .filter(
            models.NotificationRead.user_id == admin.id,
            models.NotificationRead.notif_id == notif_id
        )
        .first()
    )
    if existing:
        return {"message": f"Notification {notif_id} already marked as read"}

    notif_read = models.NotificationRead(
        user_id=admin.id,
        notif_id=notif_id,
        read_at=datetime.utcnow()
    )
    db.add(notif_read)
    db.commit()
    db.refresh(notif_read)

    return {"message": f"Notification {notif_id} marked as read"}

@router.get("/notifications/read")
def get_read_notifications(
    db: Session = Depends(database.get_db),
    admin=Depends(get_current_admin)
):
    reads = db.query(models.NotificationRead).filter(
        models.NotificationRead.user_id == admin.id
    ).all()
    return [r.notif_id for r in reads]