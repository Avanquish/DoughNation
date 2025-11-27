from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, database, auth, models
from app.email_utils import send_email
from pydantic import BaseModel
from datetime import datetime
from app.timezone_utils import now_ph

router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"]
    )

# Create Complaint
@router.post("/", response_model=schemas.ComplaintOut)
def create_complaint(
    complaint: schemas.ComplaintCreate,
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Extract user ID from either employee or user token
    if isinstance(current_auth, dict):
        # Employee token - use bakery_id as user_id for complaint
        user_id = current_auth.get("bakery_id")
    else:
        # Regular user token
        user_id = current_auth.id
    
    return crud.create_complaint(db, complaint, user_id)

# Get complaints of the logged-in user
@router.get("/me", response_model=list[schemas.ComplaintOut])
def get_my_complaints(
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Extract user ID from either employee or user token
    if isinstance(current_auth, dict):
        # Employee token - use bakery_id to get bakery's complaints
        user_id = current_auth.get("bakery_id")
    else:
        # Regular user token
        user_id = current_auth.id
    
    return db.query(models.Complaint).filter(
        models.Complaint.user_id == user_id
    ).all()

# Get all complaints (admin only)
@router.get("/", response_model=list[schemas.ComplaintOut])
def get_all_complaints(
    db: Session = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_complaints(db)

# Update complaint status (admin only)
@router.put("/{complaint_id}/status", response_model=schemas.ComplaintOut)
def update_complaint_status(
    complaint_id: int,
    status: schemas.ComplaintUpdateStatus,
    db: Session = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    complaint = crud.update_complaint_status(db, complaint_id, status.status)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

# Reply to complaint (admin only)
class ComplaintReply(BaseModel):
    message: str
    status: str = "Resolved"

@router.post("/{complaint_id}/reply")
def reply_to_complaint(
    complaint_id: int,
    reply: ComplaintReply,
    db: Session = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the complaint
    complaint = db.query(models.Complaint).filter(
        models.Complaint.id == complaint_id
    ).first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Get the user who filed the complaint
    user = db.query(models.User).filter(
        models.User.id == complaint.user_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update complaint with reply and status
    complaint.status = reply.status
    complaint.admin_reply = reply.message
    complaint.replied_at = now_ph()
    complaint.replied_by = current_user.id
    
    # Create a system notification for the user
    from app.admin_models import SystemNotification, NotificationReceipt
    notification = SystemNotification(
        title=f"Complaint Response: {complaint.subject}",
        message=f"Admin has replied to your complaint.\n\nStatus: {reply.status}\n\nResponse: {reply.message}",
        notification_type="user_specific",
        target_user_id=user.id,
        send_in_app=True,
        send_email=False,  # Email is sent separately below
        sent_by_admin_id=current_user.id,
        sent_at=now_ph(),
        priority="high"
    )
    db.add(notification)
    db.flush()  # Get the notification ID
    
    # Create notification receipt for the user
    receipt = NotificationReceipt(
        notification_id=notification.id,
        user_id=user.id,
        is_read=False
    )
    db.add(receipt)
    
    db.commit()
    
    # Send email to user
    try:
        send_email(
            to_email=user.email,
            subject=f"Reply to Your Complaint: {complaint.subject}",
            html_content=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4A2F17;">Complaint Reply from DoughNation Admin</h2>
                
                <div style="background-color: #FFF9F1; border-left: 4px solid #E49A52; padding: 15px; margin: 20px 0;">
                    <h3 style="color: #6b4b2b; margin-top: 0;">Your Complaint</h3>
                    <p><strong>Subject:</strong> {complaint.subject}</p>
                    <p><strong>Description:</strong> {complaint.description}</p>
                    <p><strong>Status:</strong> <span style="color: #166534; font-weight: bold;">{reply.status}</span></p>
                </div>
                
                <div style="background-color: #ffffff; border: 1px solid #f2e3cf; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #4A2F17; margin-top: 0;">Admin Response</h3>
                    <p style="line-height: 1.6; color: #4A2F17;">{reply.message}</p>
                </div>
                
                <p style="color: #7b5836; font-size: 14px;">
                    If you have any further questions or concerns, please don't hesitate to submit another complaint or contact us directly.
                </p>
                
                <hr style="border: none; border-top: 1px solid #f2e3cf; margin: 20px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    This is an automated message from DoughNation. Please do not reply to this email.
                </p>
            </div>
            """
        )
    except Exception as e:
        print(f"Failed to send email: {e}")
        # Don't fail the request if email fails
    
    return {
        "message": "Reply sent successfully",
        "complaint_id": complaint_id,
        "status": reply.status,
        "user_email": user.email,
        "admin_reply": reply.message
    }

# Delete complaint (user can delete their own complaints)
@router.delete("/{complaint_id}")
def delete_complaint(
    complaint_id: int,
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Extract user ID from either employee or user token
    if isinstance(current_auth, dict):
        # Employee token - use bakery_id
        user_id = current_auth.get("bakery_id")
    else:
        # Regular user token
        user_id = current_auth.id
    
    # Get the complaint
    complaint = db.query(models.Complaint).filter(
        models.Complaint.id == complaint_id
    ).first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Check if the complaint belongs to the user
    if complaint.user_id != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own complaints")
    
    # Delete the complaint
    db.delete(complaint)
    db.commit()
    
    return {"message": "Complaint deleted successfully", "complaint_id": complaint_id}
