from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models import DonationRequest, DirectDonation, User
from app.auth import get_current_user

router = APIRouter()

@router.get("/recent_donations")
def recent_donations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.utcnow()
    seven_days_ago = today - timedelta(days=7)
    results = []

    if current_user.role == "Bakery":
        # Donations sent by bakery
        donation_requests = db.query(DonationRequest).filter(
            DonationRequest.bakery_id == current_user.id,
            DonationRequest.tracking_status == "complete",
            DonationRequest.tracking_completed_at != None,
            DonationRequest.tracking_completed_at >= seven_days_ago,
        ).all()

        direct_donations = db.query(DirectDonation).filter(
            DirectDonation.bakery_inventory.has(bakery_id=current_user.id),
            DirectDonation.btracking_status == "complete",
            DirectDonation.btracking_completed_at != None,
            DirectDonation.btracking_completed_at >= seven_days_ago,
        ).all()

        for d in donation_requests:
            results.append({
                "id": d.id,
                "type": "request",
                "completed_at": d.tracking_completed_at,
                "product_name": d.donation_name or (d.inventory_item.name if d.inventory_item else "Unknown"),
                "quantity": d.donation_quantity or 0,
                "charity_name": d.charity.name if d.charity else "Unknown",
            })

        for d in direct_donations:
            results.append({
                "id": d.id,
                "type": "direct",
                "completed_at": d.btracking_completed_at,
                "product_name": d.name,
                "quantity": d.quantity,
                "charity_name": d.charity.name if d.charity else "Unknown",
            })

    elif current_user.role == "Charity":
        # Donations received by charity
        donation_requests = db.query(DonationRequest).filter(
            DonationRequest.charity_id == current_user.id,
            DonationRequest.tracking_status == "complete",
            DonationRequest.tracking_completed_at != None,
            DonationRequest.tracking_completed_at >= seven_days_ago,
        ).all()

        direct_donations = db.query(DirectDonation).filter(
            DirectDonation.charity_id == current_user.id,
            DirectDonation.btracking_status == "complete",
            DirectDonation.btracking_completed_at != None,
            DirectDonation.btracking_completed_at >= seven_days_ago,
        ).all()

        for d in donation_requests:
            results.append({
                "id": d.id,
                "type": "request",
                "completed_at": d.tracking_completed_at,
                "product_name": d.donation_name or (d.inventory_item.name if d.inventory_item else "Unknown"),
                "quantity": d.donation_quantity or 0,
                "bakery_name": d.bakery.name if d.bakery else "Unknown",
            })

        for d in direct_donations:
            bakery_name = getattr(getattr(d.bakery_inventory, "bakery", None), "name", "Unknown")
            results.append({
                "id": d.id,
                "type": "direct",
                "completed_at": d.btracking_completed_at,
                "product_name": d.name,
                "quantity": d.quantity,
                "bakery_name": bakery_name,
            })

    # Sort descending by completed_at
    results.sort(key=lambda x: x["completed_at"], reverse=True)
    return results
