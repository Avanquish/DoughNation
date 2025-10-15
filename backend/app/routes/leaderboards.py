from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

@router.get("/bakery")
def get_bakery_leaderboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Only Admin can access leaderboard
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Access denied")

    # ---- Aggregate total donations from both tables ----
    direct_donations = (
        db.query(
            models.User.id.label("bakery_id"),
            models.User.name.label("bakery_name"),
            func.coalesce(func.sum(models.DirectDonation.quantity), 0).label("total_direct")
        )
        .join(models.BakeryInventory, models.BakeryInventory.id == models.DirectDonation.bakery_inventory_id)
        .join(models.User, models.BakeryInventory.bakery_id == models.User.id)
        .filter(models.DirectDonation.btracking_status == "complete")
        .filter(models.User.role == "Bakery")
        .group_by(models.User.id, models.User.name)
        .subquery()
    )

    request_donations = (
        db.query(
            models.User.id.label("bakery_id"),
            models.User.name.label("bakery_name"),
            func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0).label("total_requested")
        )
        .join(models.User, models.DonationRequest.bakery_id == models.User.id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.User.role == "Bakery")
        .group_by(models.User.id, models.User.name)
        .subquery()
    )

    # ---- Combine both totals ----
    results = (
        db.query(
            func.coalesce(direct_donations.c.bakery_id, request_donations.c.bakery_id).label("bakery_id"),
            func.coalesce(direct_donations.c.bakery_name, request_donations.c.bakery_name).label("bakery_name"),
            (
                func.coalesce(direct_donations.c.total_direct, 0)
                + func.coalesce(request_donations.c.total_requested, 0)
            ).label("total_donated")
        )
        .outerjoin(request_donations, direct_donations.c.bakery_id == request_donations.c.bakery_id)
        .order_by(func.coalesce(direct_donations.c.total_direct, 0) + func.coalesce(request_donations.c.total_requested, 0).desc())
        .all()
    )

    # ---- Format leaderboard ----
    return [
        {
            "rank": idx + 1,
            "bakery_id": r.bakery_id,
            "bakery_name": r.bakery_name,
            "total_donated": int(r.total_donated or 0),
        }
        for idx, r in enumerate(sorted(results, key=lambda x: x.total_donated, reverse=True))
    ]
