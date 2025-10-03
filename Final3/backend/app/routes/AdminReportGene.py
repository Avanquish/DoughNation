from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, date
from app import database, models, auth

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

# Admin-only check
def check_admin(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@router.get("/manage_users")
def manage_users_report(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_admin),
    sort: str = "desc"
):
    # validate date range
    today = date.today()
    if end_date > today:
        raise HTTPException(status_code=400, detail="End date cannot be in the future")
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")

    order_by = models.User.created_at.asc() if sort == "asc" else desc(models.User.created_at)

    verified_users = (
        db.query(models.User)
        .filter(models.User.verified == True)
        .filter(models.User.role != "Admin")
        .filter(models.User.created_at >= start_date)
        .filter(models.User.created_at <= end_date)
        .order_by(order_by)
        .all()
    )

    result = []
    for u in verified_users:
        result.append({
            "role": u.role,
            "name": u.name,
            "email": u.email,
            "contact_person": u.contact_person,
            "address": u.address,
            "profile_picture": u.profile_picture,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return {"users": result, "start_date": start_date.isoformat(), "end_date": end_date.isoformat()}
