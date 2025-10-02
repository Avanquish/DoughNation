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

    # Count completed DonationRequests received by this charity
    normal_total = (
        db.query(func.count(models.DonationRequest.id))
        .filter(
            models.DonationRequest.charity_id == charity_id,
            models.DonationRequest.tracking_status == "complete"
        )
        .scalar()
    )

    # Count completed DirectDonations received by this charity
    direct_total = (
        db.query(func.count(models.DirectDonation.id))
        .filter(
            models.DirectDonation.charity_id == charity_id,
            models.DirectDonation.btracking_status == "complete"
        )
        .scalar()
    )

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

    # Count completed DonationRequests for this bakery via inventory
    normal_total = (
        db.query(func.count(models.DonationRequest.id))
        .join(models.BakeryInventory, models.DonationRequest.bakery_inventory_id == models.BakeryInventory.id)
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.DonationRequest.tracking_status == "complete"
        )
        .scalar()
    )

    # Count completed DirectDonations for this bakery via inventory
    direct_total = (
        db.query(func.count(models.DirectDonation.id))
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.DirectDonation.btracking_status == "complete"
        )
        .scalar()
    )

    grand_total = normal_total + direct_total

    return {
        "grand_total": grand_total,
        "normal_total": normal_total,
        "direct_total": direct_total,
    }

# Count the total product uploaded in for donation (bakery ui)
@router.get("/bakery/total_products_for_donation")
def get_total_products_for_donation(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role.lower() != "bakery":
        return {"error": "Not authorized"}

    bakery_id = current_user.id

    # Count distinct products uploaded by this bakery
    total_products = (
        db.query(func.count(models.Donation.bakery_inventory_id.distinct()))
        .filter(models.Donation.bakery_id == bakery_id)
        .scalar()
    )

    return {"total_products": total_products}