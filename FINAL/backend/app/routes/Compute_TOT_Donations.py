from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, auth

router = APIRouter()

# Count the total donation received but charity (specific charity not all)
@router.get("/charity/total_donations")
def get_charity_totals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role.lower() != "charity":
        return {"error": "Not authorized"}

    charity_id = current_user.id

    # Sum of donation_quantity for completed DonationRequests
    normal_total = db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0)) \
        .filter(models.DonationRequest.charity_id == charity_id) \
        .filter(models.DonationRequest.tracking_status == "complete") \
        .scalar()

    # Sum of quantity for completed DirectDonations
    direct_total = db.query(func.coalesce(func.sum(models.DirectDonation.quantity), 0)) \
        .filter(models.DirectDonation.charity_id == charity_id) \
        .filter(models.DirectDonation.btracking_status == "complete") \
        .scalar()

    grand_total = normal_total + direct_total

    return {
        "grand_total": grand_total,
        "normal_total": normal_total,
        "direct_total": direct_total,
    }

# Count the total donation send to charity either direct or normal (specific bakery not all)
@router.get("/bakery/total_donations_sent")
def get_bakery_totals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role.lower() != "bakery":
        return {"error": "Not authorized"}

    bakery_id = current_user.id

    # Sum of donation_quantity for completed DonationRequests sent by this bakery
    normal_total = db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0)) \
        .filter(models.DonationRequest.bakery_id == bakery_id) \
        .filter(models.DonationRequest.tracking_status == "complete") \
        .scalar()

    # Sum of quantity for completed DirectDonations sent by this bakery
    direct_total = db.query(func.coalesce(func.sum(models.DirectDonation.quantity), 0)) \
        .join(models.BakeryInventory) \
        .filter(models.BakeryInventory.bakery_id == bakery_id) \
        .filter(models.DirectDonation.btracking_status == "complete") \
        .scalar()

    grand_total = normal_total + direct_total

    return {
        "grand_total": grand_total,
        "normal_total": normal_total,
        "direct_total": direct_total,
    }