from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app import models
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

@router.get("/bakery")
def get_bakery_leaderboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Access denied")


    results = (
        db.query(
            models.User.id.label("bakery_id"),
            models.User.name.label("bakery_name"),
            func.sum(models.BakeryInventory.quantity).label("total_donated"),
        )
        .join(models.BakeryInventory, models.BakeryInventory.bakery_id == models.User.id)
        .outerjoin(models.DirectDonation, models.DirectDonation.charity_id == models.User.id)
        .outerjoin(models.DonationRequest, models.DonationRequest.bakery_id == models.User.id)
        .filter(models.User.role == "Bakery")
        .filter(
            or_(
                models.DirectDonation.btracking_status == "complete",
                models.DonationRequest.tracking_status == "complete",
            )
        )
        .group_by(models.User.id, models.User.name)
        .order_by(func.sum(models.BakeryInventory.quantity).desc())
        .all()
    )

    return [
        {
            "rank": idx + 1,
            "bakery_id": r.bakery_id,
            "bakery_name": r.bakery_name,
            "total_donated": r.total_donated or 0,
        }
        for idx, r in enumerate(results)
    ]