
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models import DonationRequest, DirectDonation, User
from app.auth import get_current_user_or_employee, get_bakery_id_from_auth

router = APIRouter()

@router.get("/recent_donations")
def recent_donations(
    user_id: int = None,  # optional user_id
    db: Session = Depends(get_db),
    current_auth = Depends(get_current_user_or_employee),
):
    # Determine target user ID
    if isinstance(current_auth, dict):
        # Employee - use bakery_id
        target_user_id = user_id or current_auth.get("bakery_id")
    else:
        # Bakery owner
        target_user_id = user_id or current_auth.id
        
    today = datetime.utcnow()
    seven_days_ago = today - timedelta(days=7)
    results = []

    # Fetch user role for the target user
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        return results

    if target_user.role == "Bakery":
        # Donations sent by bakery
        donation_requests = db.query(DonationRequest).filter(
            DonationRequest.bakery_id == target_user_id,
            DonationRequest.tracking_status == "complete",
            DonationRequest.tracking_completed_at != None,
            DonationRequest.tracking_completed_at >= seven_days_ago,
        ).all()

        direct_donations = db.query(DirectDonation).filter(
            DirectDonation.bakery_inventory.has(bakery_id=target_user_id),
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

    elif target_user.role == "Charity":
        # Donations received by charity
        donation_requests = db.query(DonationRequest).filter(
            DonationRequest.charity_id == target_user_id,
            DonationRequest.tracking_status == "complete",
            DonationRequest.tracking_completed_at != None,
            DonationRequest.tracking_completed_at >= seven_days_ago,
        ).all()

        direct_donations = db.query(DirectDonation).filter(
            DirectDonation.charity_id == target_user_id,
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

    results.sort(key=lambda x: x["completed_at"], reverse=True)
    return results
