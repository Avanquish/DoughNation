# app/routes/bakerydashboardstats.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database, auth
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(database.get_db), current_user=Depends(auth.get_current_user)):
    # Ensure user is Bakery role
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Not authorized")

    bakery_id = current_user.id  # Use ID directly from DB

    # Total donations (if you have Donation model)
    total_donations = db.query(models.Donation).filter(models.Donation.bakery_id == bakery_id).count() if hasattr(models, "Donation") else 0

    # Total inventory items uploaded by this bakery
    total_inventory = db.query(models.BakeryInventory).filter(models.BakeryInventory.bakery_id == bakery_id).count()

    # Uploaded products (same as total inventory in your current design)
    uploaded_products = total_inventory

    # Employee count for this bakery
    employee_count = db.query(models.Employee).filter(models.Employee.bakery_id == bakery_id).count()

    # Expired products (only for this bakery)
    expired_products = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.bakery_id == bakery_id,
        models.BakeryInventory.expiration_date < datetime.today()
    ).count()

    # Products nearing expiration within 2 days
    nearing_expiration = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.bakery_id == bakery_id,
        models.BakeryInventory.expiration_date > datetime.today(),  # only future dates
        models.BakeryInventory.expiration_date <= datetime.today() + timedelta(days=2)  # within 2 days
    ).count()

    return {
        "totalDonations": total_donations,
        "totalInventory": total_inventory,
        "uploadedProducts": uploaded_products,
        "employeeCount": employee_count,
        "expiredProducts": expired_products,
        "nearingExpiration": nearing_expiration
    }
