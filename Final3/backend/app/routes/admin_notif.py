# app/routes/notifications.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app import models
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Utility: build notifications from pending users + feedback
def build_notifications(db: Session):
    notifications = []

    # Pending users
    users = db.query(models.User).filter(models.User.status == "Pnding").all()
    print("DEBUG: Pending users fetched:", users)
    for u in users:
        notifications.append({
            "id": f"reg-{u.id}",
            "kind": "registration",
            "title": f"New {u.role} registration",
            "subtitle": f"{u.name} · {u.email}",
            "created_at": u.created_at,
        })

    # Feedback
    feedbacks = db.query(models.Feedback).all()
    print("DEBUG: Feedback fetched:", feedbacks)
    for f in feedbacks:
        notifications.append({
            "id": f"fb-{f.id}",
            "kind": "feedback",
            "title": f.type or "New Feedback",
            "subtitle": (f.summary or f.message or "").strip()[:120],
            "created_at": f.created_at,
        })

    # Complaints
    complaints = db.query(models.Complaint).filter(
        models.Complaint.status == models.ComplaintStatus.pending
    ).all()
    print("DEBUG: Complaints fetched:", complaints)
    for c in complaints:
        role = c.user.role.capitalize() if c.user else "User"
        notifications.append({
            "id": f"comp-{c.id}",
            "kind": "complaint",
            "title": f"Complaint from {role}",
            "subtitle": c.subject[:120],
            "created_at": c.created_at,
        })

    # Sort newest first
    notifications.sort(key=lambda n: n["created_at"] or datetime.min, reverse=True)
    print("DEBUG: Final notifications list:", notifications)
    return notifications

# Get all notifications (with read flag)
@router.get("/")
def get_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    print("DEBUG: Current user:", current_user)
    notifications = build_notifications(db)

    read_ids = db.query(models.NotificationRead.notif_id).filter_by(
        user_id=current_user.id
    ).all()
    print("DEBUG: Read notification IDs fetched:", read_ids)
    read_ids = {r[0] for r in read_ids}

    for n in notifications:
        n["read"] = n["id"] in read_ids

    print("DEBUG: Notifications with read flags:", notifications)
    return notifications
