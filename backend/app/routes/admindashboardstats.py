# app/routes/admindashboardstats.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database, auth

router = APIRouter()

@router.get("/admin-dashboard-stats")
def get_admin_dashboard_stats(
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
    # Ensure user is Admin role
    if current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    total_bakeries = db.query(models.User).filter(
        models.User.role == "Bakery",
        models.User.verified == True
    ).count()

    total_charities = db.query(models.User).filter(
        models.User.role == "Charity",
        models.User.verified == True
    ).count()

    total_users = db.query(models.User).filter(
        models.User.role.in_(["Bakery", "Charity"]),
        models.User.verified == True
    ).count()

    pending_users = db.query(models.User).filter(
        models.User.verified == False
    ).count()

    return {
        "totalBakeries": total_bakeries,
        "totalCharities": total_charities,
        "totalUsers": total_users,
        "pendingUsers": pending_users
    }
