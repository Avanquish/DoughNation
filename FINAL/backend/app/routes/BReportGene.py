from fastapi import APIRouter, Depends, HTTPException, Query
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

    sort_order = {"available": 0, "requested": 1, "donated": 2}
    result.sort(key=lambda x: sort_order.get(x["donation_status"], 99))

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
            models.BakeryInventory.status != "donated",
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
    # --- Direct donations (only complete) ---
    direct_items = (
        db.query(
            models.DirectDonation.name.label("product_name"),
            func.sum(models.DirectDonation.quantity).label("quantity"),
        )
        .join(
            models.BakeryInventory,
            models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id,
        )
        .filter(models.BakeryInventory.bakery_id == current_user.id)
        .filter(models.DirectDonation.btracking_status == "complete")
        .group_by(models.DirectDonation.name)
        .all()
    )

    # --- Donation requests (only complete) ---
    request_items = (
        db.query(
            models.DonationRequest.donation_name.label("product_name"),
            func.sum(models.DonationRequest.donation_quantity).label("quantity"),
        )
        .filter(models.DonationRequest.bakery_id == current_user.id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .group_by(models.DonationRequest.donation_name)
        .all()
    )

    # --- Merge results ---
    summary = {}
    for row in direct_items:
        summary[row.product_name] = summary.get(row.product_name, 0) + int(row.quantity or 0)

    for row in request_items:
        summary[row.product_name] = summary.get(row.product_name, 0) + int(row.quantity or 0)

    # --- Convert to list of dicts, sort, and limit to 10 ---
    result = [
        {"product_name": name, "total_quantity": qty}
        for name, qty in summary.items()
    ]

    result = sorted(result, key=lambda x: x["total_quantity"], reverse=True)[:10]

    return result


@router.get("/weekly")
def weekly_summary(
    start_date: str | None = Query(None, description="Week start date YYYY-MM-DD"),
    end_date: str | None = Query(None, description="Week end date YYYY-MM-DD"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_bakery)
):
    today = datetime.utcnow().date()
    week_start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else today - timedelta(days=7)
    week_end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else today

    # include full end date by adding 1 day
    week_end_inclusive = week_end + timedelta(days=1)

    # --- Direct Donations ---
    direct_donations = (
        db.query(func.coalesce(func.sum(models.DirectDonation.quantity), 0))
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == current_user.id)
        .filter(models.DirectDonation.btracking_status == "complete")
        .filter(models.DirectDonation.created_at >= week_start,
                models.DirectDonation.created_at < week_end_inclusive)
        .scalar()
    )

    # --- Donation Requests ---
    request_donations = (
        db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0))
        .filter(models.DonationRequest.bakery_id == current_user.id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.timestamp >= week_start,
                models.DonationRequest.timestamp < week_end_inclusive)
        .scalar()
    )

    # --- Expired products (exclude donated/complete items) ---
    expired_total = (
        db.query(func.sum(models.BakeryInventory.quantity))
        .filter(models.BakeryInventory.bakery_id == current_user.id)
        .filter(models.BakeryInventory.status != "donated")   # or "complete"
        .filter(models.BakeryInventory.expiration_date >= week_start,
                models.BakeryInventory.expiration_date < week_end_inclusive)
        .scalar() or 0
    )
    
    # --- Available products (not expired, not donated/complete) ---
    available_total = (
        db.query(func.sum(models.BakeryInventory.quantity))
        .filter(models.BakeryInventory.bakery_id == current_user.id)
        .filter(models.BakeryInventory.status == "available")
        .filter(models.BakeryInventory.expiration_date >= week_start,
                models.BakeryInventory.expiration_date < week_end_inclusive)
        .scalar() or 0
    )
    # --- Top donated items ---
    top_items = (
        db.query(
            models.DonationRequest.donation_name.label("product_name"),
            func.sum(models.DonationRequest.donation_quantity).label("quantity"),
        )
        .filter(models.DonationRequest.bakery_id == current_user.id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.timestamp >= week_start,
                models.DonationRequest.timestamp < week_end_inclusive)
        .group_by(models.DonationRequest.donation_name)
        .union_all(
            db.query(
                models.DirectDonation.name.label("product_name"),
                func.sum(models.DirectDonation.quantity).label("quantity"),
            )
            .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
            .filter(models.BakeryInventory.bakery_id == current_user.id)
            .filter(models.DirectDonation.btracking_status == "complete")
            .filter(models.DirectDonation.created_at >= week_start,
                    models.DirectDonation.created_at < week_end_inclusive)
            .group_by(models.DirectDonation.name)
        )
        .all()
    )

    # Merge duplicates and return top 10
    merged_top = {}
    for row in top_items:
        merged_top[row.product_name] = merged_top.get(row.product_name, 0) + int(row.quantity or 0)

    top_10_items = sorted(
        [{"product_name": name, "quantity": qty} for name, qty in merged_top.items()],
        key=lambda x: x["quantity"],
        reverse=True
    )[:10]

    return {
        "bakery_id": current_user.id,
        "bakery_name": current_user.name,
        "week_start": str(week_start),
        "week_end": str(week_end),
        "total_direct_donations": direct_donations or 0,
        "total_request_donations": request_donations or 0,
        "total_donations": (direct_donations or 0) + (request_donations or 0),
        "top_items": top_10_items,
        "expired_products": expired_total,
        "available_products": available_total 
    }


@router.get("/monthly")
def monthly_summary(
    month: str | None = Query(None, description="Month YYYY-MM, e.g. 2025-09"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_bakery)
):
    today = datetime.utcnow().date()
    if month:
        try:
            start_date = datetime.strptime(month + "-01", "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM.")
    else:
        start_date = today.replace(day=1)  # first day of current month

    # last day of month
    if start_date.month == 12:
        end_date = start_date.replace(year=start_date.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end_date = start_date.replace(month=start_date.month + 1, day=1) - timedelta(days=1)

    end_date_inclusive = end_date + timedelta(days=1)

    # --- Direct Donations ---
    direct_donations = (
        db.query(func.coalesce(func.sum(models.DirectDonation.quantity), 0))
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == current_user.id)
        .filter(models.DirectDonation.btracking_status == "complete")
        .filter(models.DirectDonation.created_at >= start_date,
                models.DirectDonation.created_at < end_date_inclusive)
        .scalar()
    )

    # --- Donation Requests ---
    request_donations = (
        db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0))
        .filter(models.DonationRequest.bakery_id == current_user.id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.timestamp >= start_date,
                models.DonationRequest.timestamp < end_date_inclusive)
        .scalar()
    )

    # --- Top donated items for monthly ---
    top_items = (
        db.query(
            models.DonationRequest.donation_name.label("product_name"),
            func.sum(models.DonationRequest.donation_quantity).label("quantity"),
        )
        .filter(models.DonationRequest.bakery_id == current_user.id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.timestamp >= start_date,
                models.DonationRequest.timestamp < end_date_inclusive)
        .group_by(models.DonationRequest.donation_name)
        .union_all(
            db.query(
                models.DirectDonation.name.label("product_name"),
                func.sum(models.DirectDonation.quantity).label("quantity"),
            )
            .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
            .filter(models.BakeryInventory.bakery_id == current_user.id)
            .filter(models.DirectDonation.btracking_status == "complete")
            .filter(models.DirectDonation.created_at >= start_date,
                    models.DirectDonation.created_at < end_date_inclusive)
            .group_by(models.DirectDonation.name)
        )
        .all()
    )

    # --- Expired / Available products ---
    expired_total = (
        db.query(func.sum(models.BakeryInventory.quantity))
        .filter(models.BakeryInventory.bakery_id == current_user.id)
        .filter(models.BakeryInventory.status != "donated")
        .filter(models.BakeryInventory.expiration_date >= start_date,
                models.BakeryInventory.expiration_date < end_date_inclusive)
        .scalar() or 0
    )

    available_total = (
        db.query(func.sum(models.BakeryInventory.quantity))
        .filter(models.BakeryInventory.bakery_id == current_user.id)
        .filter(models.BakeryInventory.status == "available")
        .filter(models.BakeryInventory.expiration_date >= start_date,
                models.BakeryInventory.expiration_date < end_date_inclusive)
        .scalar() or 0
    )

    # Merge duplicates and pick top 10
    merged_top = {}
    for row in top_items:
        merged_top[row.product_name] = merged_top.get(row.product_name, 0) + int(row.quantity or 0)

    top_10_items = sorted(
        [{"product_name": name, "quantity": qty} for name, qty in merged_top.items()],
        key=lambda x: x["quantity"],
        reverse=True
    )[:10]

    return {
        "month": start_date.strftime("%Y-%m"),
        "total_direct_donations": direct_donations or 0,
        "total_request_donations": request_donations or 0,
        "total_donations": (direct_donations or 0) + (request_donations or 0),
        "expired_products": expired_total,
        "available_products": available_total,
        "top_items": top_10_items
    }


@router.get("/bakery-info")
def bakery_info(current_user: models.User = Depends(check_bakery)):
    return {
        "profile": current_user.profile_picture,
        "name": current_user.name,
        "address": current_user.address,
        "contact_number": current_user.contact_number,
        "email": current_user.email
    }
