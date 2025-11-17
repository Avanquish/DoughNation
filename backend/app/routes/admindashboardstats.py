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

    total_bakeries = db.query(models.User).filter(models.User.role == "Bakery").filter(models.User.verified == True).count()
    total_charities = db.query(models.User).filter(models.User.role == "Charity").filter(models.User.verified == True).count()
    # Exclude Admin accounts from total users count
    total_users = db.query(models.User).filter(models.User.verified == True).filter(models.User.role != "Admin").count()
    # Exclude Admin accounts from pending users count
    pending_users = db.query(models.User).filter(models.User.verified == False).filter(models.User.role != "Admin").count()

    print("DEBUG:", total_bakeries, total_charities, total_users, pending_users)  # <--- Add this temporarily

    return {
        "totalBakeries": total_bakeries,
        "totalCharities": total_charities,
        "totalUsers": total_users,
        "pendingUsers": pending_users
    }