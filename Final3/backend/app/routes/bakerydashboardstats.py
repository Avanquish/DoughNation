# app/routes/bakerydashboardstats.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database, auth
from datetime import datetime, timedelta, timezone

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

    # Philippine Time is UTC+8
    philippine_tz = timezone(timedelta(hours=8))
    today_philippine = datetime.now(philippine_tz).date()

    # Expired products (expiration_date < today, meaning yesterday or earlier)
    expired_products = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.bakery_id == bakery_id,
        models.BakeryInventory.expiration_date < today_philippine
    ).count()

    # Products nearing expiration - match frontend logic exactly
    # Frontend: statusOf checks if d <= threshold (where d = days until expiration)
    # We need to fetch all items that are NOT expired yet
    inventory_items = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.bakery_id == bakery_id,
        models.BakeryInventory.expiration_date >= today_philippine  # Today or future
    ).all()

    nearing_expiration = 0
    for item in inventory_items:
        # Calculate days until expiration (matching frontend daysUntil function)
        days_until_expiration = (item.expiration_date - today_philippine).days
        
        # Match frontend logic exactly:
        # if (threshold === 0 && d <= 1) return "soon"
        # if (d <= threshold) return "soon"
        if item.threshold == 0:
            # For threshold 0: include today (0) and tomorrow (1)
            if days_until_expiration <= 1:
                nearing_expiration += 1
        else:
            # For other thresholds: d <= threshold
            if days_until_expiration <= item.threshold:
                nearing_expiration += 1


    return {
        "totalDonations": total_donations,
        "totalInventory": total_inventory,
        "uploadedProducts": uploaded_products,
        "employeeCount": employee_count,
        "expiredProducts": expired_products,
        "nearingExpiration": nearing_expiration
    }
