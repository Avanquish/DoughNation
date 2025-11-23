from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from app import models, database
from app.timezone_utils import now_ph
from app.auth import get_current_admin  # Only allow admins
from app.email_utils import send_account_verified_email, send_email  # ✅ NEW: Import email function

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
            "proof_file": u.proof_of_validity,  # Include proof file in response
            "created_at": u.created_at.isoformat() if u.created_at else None  # Add created_at for notifications
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

class RejectUserRequest(BaseModel):
    reason: str

@router.post("/reject-user/{user_id}")
def reject_user(user_id: int, body: RejectUserRequest, db: Session = Depends(database.get_db), admin=Depends(get_current_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Store user info before deletion for email
    user_name = user.name
    user_email = user.email
    user_role = user.role
    rejection_reason = body.reason
    
    # Delete the user
    db.delete(user)
    db.commit()
    
    # Send rejection email
    try:
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FFF3E6 0%, #FFE1BD 50%, #FFD199 100%); 
                        padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4A2F17; margin: 0; font-size: 28px;">DoughNation</h1>
                <p style="color: #6b4b2b; margin: 10px 0 0 0; font-size: 14px;">Food Waste Reduction Platform</p>
            </div>
            
            <div style="background-color: #FFF9F1; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h2 style="color: #dc2626; margin-top: 0; font-size: 22px;">Account Registration Not Approved</h2>
                <p style="color: #4A2F17; line-height: 1.6; font-size: 15px;">
                    Dear {user_name},
                </p>
                <p style="color: #4A2F17; line-height: 1.6; font-size: 15px;">
                    Thank you for your interest in joining DoughNation as a <strong>{user_role}</strong>. 
                    After careful review of your registration, we regret to inform you that we are unable to approve 
                    your account at this time.
                </p>
            </div>
            
            <div style="background-color: #ffffff; border: 2px solid #f2e3cf; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #4A2F17; margin-top: 0; font-size: 18px; border-bottom: 2px solid #E49A52; padding-bottom: 10px;">
                    Reason for Rejection
                </h3>
                <p style="color: #4A2F17; line-height: 1.8; font-size: 15px; white-space: pre-wrap;">
{rejection_reason}
                </p>
            </div>
            
            <div style="background-color: #FFF6EC; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="color: #4A2F17; margin-top: 0; font-size: 16px;">What happens next?</h3>
                <ul style="color: #6b4b2b; line-height: 1.8; font-size: 14px;">
                    <li>Your account registration has been declined and your data has been removed from our system.</li>
                    <li>If you believe this is an error or have questions, please contact our support team.</li>
                    <li>You may reapply in the future if you can address the concerns mentioned above.</li>
                </ul>
            </div>
            
            <div style="background-color: #f8f8f8; padding: 15px; border-radius: 8px; margin-top: 30px;">
                <p style="color: #6b4b2b; font-size: 13px; margin: 0; line-height: 1.6;">
                    If you have any questions or need clarification, please don't hesitate to reach out to us at 
                    <a href="mailto:support@doughnation.com" style="color: #E49A52; text-decoration: none;">support@doughnation.com</a>
                </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #f2e3cf; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                This is an automated message from DoughNation. Please do not reply to this email.
            </p>
            <p style="color: #999; font-size: 11px; text-align: center; margin: 10px 0 0 0;">
                © 2025 DoughNation. All rights reserved.
            </p>
        </div>
        """
        
        send_email(
            to_email=user_email,
            subject="DoughNation Account Registration - Not Approved",
            html_content=html_content
        )
    except Exception as e:
        print(f"Failed to send rejection email to {user_email}: {e}")
        # Don't fail the request if email fails
    
    return {
        "message": f"User {user_name} rejected and deleted",
        "email_sent": True,
        "user_email": user_email
    }

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

@router.delete("/force-delete-user/{user_id}")
def force_delete_user(user_id: int, db: Session = Depends(database.get_db), admin=Depends(get_current_admin)):
    """
    Force delete a user account (admin only)
    This will delete the user and all related data (employees, inventory, donations, etc.)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_name = user.name
    user_role = user.role
    
    try:
        # Delete related employees if bakery
        if user_role == "Bakery":
            employees = db.query(models.Employee).filter(models.Employee.bakery_id == user_id).all()
            for emp in employees:
                db.delete(emp)
        
        # Delete related donations
        donations = db.query(models.Donation).filter(
            (models.Donation.bakery_id == user_id) | (models.Donation.charity_id == user_id)
        ).all()
        for donation in donations:
            db.delete(donation)
        
        # Delete the user
        db.delete(user)
        db.commit()
        
        return {
            "message": f"{user_role} '{user_name}' and all related data forcefully deleted",
            "user_id": user_id,
            "user_name": user_name,
            "user_role": user_role
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

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
        read_at=now_ph()
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