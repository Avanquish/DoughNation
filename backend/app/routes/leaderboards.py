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
    # Allow Admin to view leaderboard
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Access denied")

    # ---- 1️⃣ Direct donations ----
    direct_donations = (
        db.query(
            models.User.id.label("bakery_id"),
            models.User.name.label("bakery_name"),
            func.coalesce(func.sum(models.DirectDonation.quantity), 0).label("total_direct")
        )
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .join(models.User, models.BakeryInventory.bakery_id == models.User.id)
        .filter(models.DirectDonation.btracking_status == "complete")
        .filter(models.User.role == "Bakery")
        .group_by(models.User.id, models.User.name)
        .subquery()
    )

    # ---- 2️⃣ Requested donations ----
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

    # ---- 3️⃣ Combine totals ----
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
        .order_by(
            (
                func.coalesce(direct_donations.c.total_direct, 0)
                + func.coalesce(request_donations.c.total_requested, 0)
            ).desc()
        )
        .all()
    )

    # ---- 4️⃣ Format leaderboard ----
    leaderboard = [
        {
            "rank": idx + 1,
            "bakery_id": row.bakery_id,
            "bakery_name": row.bakery_name,
            "total_donated": int(row.total_donated or 0),
        }
        for idx, row in enumerate(results)
    ]

    return leaderboard