from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import database, models, auth
from datetime import datetime, timedelta
from app.timezone_utils import now_ph

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

def check_bakery_or_employee(current_auth = Depends(auth.get_current_user_or_employee)):
    """Allow both bakery owners and employees to access reports"""
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    return current_auth, bakery_id

from sqlalchemy.orm import joinedload

@router.get("/donation")
def donation_report(
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    current_auth, bakery_id = auth_data
    donations = (
        db.query(models.Donation)
        .options(
            joinedload(models.Donation.inventory_item),  # join bakery_inventory
            joinedload(models.Donation.bakery)           # join bakery (user)
        )
        .filter(models.Donation.bakery_id == bakery_id)
        .all()
    )

    result = []
    for d in donations:
        inv = d.inventory_item
        result.append({
            "product_id": inv.product_id if inv else None,
            "name": d.name,  # comes from Donation
            "quantity": d.quantity,
            "creation_date": d.creation_date,
            "uploaded_by": d.uploaded,  # this is your "employee name"
            "bakery_name": d.bakery.name if d.bakery else None,
            "image": f"{d.image}" if d.image else None,
            "threshold": d.threshold,
            "expiration_date": d.expiration_date,
            "description": d.description
        })

    return result

@router.get("/expiry")
def expiry_loss_report(
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    current_auth, bakery_id = auth_data
    expired = (
        db.query(models.BakeryInventory)
        .options(
            joinedload(models.BakeryInventory.bakery)  # join bakery relationship
        )
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.BakeryInventory.expiration_date < now_ph(),
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
    auth_data = Depends(check_bakery_or_employee)
):
    current_auth, bakery_id = auth_data
    badges = db.query(models.BadgeProgress).filter(
        models.BadgeProgress.bakery_id == bakery_id
    ).all()
    return badges

@router.get("/top_items")
def top_donated_items(
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    current_auth, bakery_id = auth_data
    items = (
        db.query(models.BakeryInventory.name, func.count(models.Donation.id).label("total"))
        .join(models.Donation, models.BakeryInventory.id == models.Donation.bakery_inventory_id)
        .filter(models.Donation.bakery_id == bakery_id)
        .group_by(models.BakeryInventory.name)
        .order_by(func.count(models.Donation.id).desc())
        .limit(5)
        .all()
    )
    return [{"product_name": r[0], "donation_count": r[1]} for r in items]

@router.get("/weekly")
def weekly_summary(
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    current_auth, bakery_id = auth_data
    start_date = now_ph() - timedelta(days=7)
    donations = (
        db.query(func.date(models.Donation.created_at).label("day"),
                 func.count(models.Donation.id).label("donations"))
        .filter(models.Donation.bakery_id == bakery_id,
                models.Donation.created_at >= start_date)
        .group_by(func.date(models.Donation.created_at))
        .all()
    )
    return [{"day": d[0], "donations": d[1]} for d in donations]

@router.get("/monthly")
def monthly_summary(
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    current_auth, bakery_id = auth_data
    start_date = now_ph() - timedelta(days=30)
    donations = (
        db.query(func.strftime("%Y-%m", models.Donation.created_at).label("month"),
                 func.count(models.Donation.id).label("donations"))
        .filter(models.Donation.bakery_id == bakery_id,
                models.Donation.created_at >= start_date)
        .group_by(func.strftime("%Y-%m", models.Donation.created_at))
        .all()
    )
    return [{"month": d[0], "donations": d[1]} for d in donations]

