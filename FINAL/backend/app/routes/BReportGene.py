from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import database, models, auth
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

def check_bakery(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Bakery":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

from sqlalchemy.orm import joinedload

@router.get("/donation")
def donation_report(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_bakery)
):
    allowed_statuses = ["available", "requested", "donated"]


    inventories = (
        db.query(models.BakeryInventory)
        .options(joinedload(models.BakeryInventory.bakery))
        .filter(
            models.BakeryInventory.bakery_id == current_user.id,
            models.BakeryInventory.status.in_(allowed_statuses)  # filter here
        )
        .all()
    )

    result = []
    for inv in inventories:
        # Determine donation_status: 'donated', 'requested', or just inventory status
        status = inv.status
        result.append({
            "product_id": inv.product_id,
            "name": inv.name,
            "quantity": inv.quantity,
            "creation_date": inv.creation_date,
            "expiration_date": inv.expiration_date,
            "threshold": inv.threshold,
            "uploaded_by": inv.uploaded,
            "description": inv.description,
            "image": f"{inv.image}" if inv.image else None,
            "donation_status": status,  # Use this in frontend for sorting/filter
        })

    return result

@router.get("/expiry")
def expiry_loss_report(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_bakery)
):
    expired = (
        db.query(models.BakeryInventory)
        .options(
            joinedload(models.BakeryInventory.bakery)  # join bakery relationship
        )
        .filter(
            models.BakeryInventory.bakery_id == current_user.id,
            models.BakeryInventory.expiration_date < datetime.utcnow(),
        )
        .all()
    )

    result = []
    for inv in expired:
        result.append({
            "product_id": inv.product_id,
            "image": f"{inv.image}" if inv.image else None,
            "name": inv.name,
            "quantity": inv.quantity,
            "bakery_name": inv.bakery.name if inv.bakery else None,  
            "uploaded": inv.uploaded, 
            "creation_date": inv.creation_date,
            "expiration_date": inv.expiration_date,
            "threshold": inv.threshold,
            "description": inv.description
        })

    return result

@router.get("/badge")
def badge_progress_report(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_bakery)
):
    badges = db.query(models.BadgeProgress).filter(
        models.BadgeProgress.bakery_id == current_user.id
    ).all()
    return badges

@router.get("/top_items")
def top_donated_items(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_bakery)
):
    items = (
        db.query(models.BakeryInventory.name, func.count(models.Donation.id).label("total"))
        .join(models.Donation, models.BakeryInventory.id == models.Donation.bakery_inventory_id)
        .filter(models.Donation.bakery_id == current_user.id)
        .group_by(models.BakeryInventory.name)
        .order_by(func.count(models.Donation.id).desc())
        .limit(5)
        .all()
    )
    return [{"product_name": r[0], "donation_count": r[1]} for r in items]

@router.get("/weekly")
def weekly_summary(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_bakery)
):
    start_date = datetime.utcnow() - timedelta(days=7)
    donations = (
        db.query(func.date(models.Donation.created_at).label("day"),
                 func.count(models.Donation.id).label("donations"))
        .filter(models.Donation.bakery_id == current_user.id,
                models.Donation.created_at >= start_date)
        .group_by(func.date(models.Donation.created_at))
        .all()
    )
    return [{"day": d[0], "donations": d[1]} for d in donations]

@router.get("/monthly")
def monthly_summary(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_bakery)
):
    start_date = datetime.utcnow() - timedelta(days=30)
    donations = (
        db.query(func.strftime("%Y-%m", models.Donation.created_at).label("month"),
                 func.count(models.Donation.id).label("donations"))
        .filter(models.Donation.bakery_id == current_user.id,
                models.Donation.created_at >= start_date)
        .group_by(func.strftime("%Y-%m", models.Donation.created_at))
        .all()
    )
    return [{"month": d[0], "donations": d[1]} for d in donations]
