from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import database, models, auth
from datetime import datetime, timedelta
from app.timezone_utils import now_ph, today_ph
from sqlalchemy.orm import joinedload

router = APIRouter(
    prefix="/report",
    tags=["Reports"]
)

def check_charity(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Charity":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@router.get("/donation_history")
def donation_history(
    user_id: int = None,  # optional: view another user's donation history
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    target_user_id = user_id or current_user.id
    results = []

    # Fetch user role for the target user
    target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
    if not target_user:
        return results

    if target_user.role == "Bakery":
        # All donations sent by bakery (no date limit)
        donation_requests = db.query(models.DonationRequest).filter(
            models.DonationRequest.bakery_id == target_user_id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
        ).all()

        direct_donations = db.query(models.DirectDonation).filter(
            models.DirectDonation.bakery_inventory.has(bakery_id=target_user_id),
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at != None,
        ).all()

        for d in donation_requests:
            results.append({
                "id": d.id,
                "type": "request",
                "completed_at": d.tracking_completed_at.strftime("%m-%d-%Y") if d.tracking_completed_at else None,
                "product_name": d.donation_name or (d.inventory_item.name if d.inventory_item else "Unknown"),
                "quantity": d.donation_quantity or 0,
                "bakery_name": target_user.name,  # ✅ the bakery itself (sender)
            })

        for d in direct_donations:
            results.append({
                "id": d.id,
                "type": "direct",
                "completed_at": d.btracking_completed_at.strftime("%m-%d-%Y") if d.btracking_completed_at else None,
                "product_name": d.name,
                "quantity": d.quantity,
                "bakery_name": target_user.name,  # ✅ consistent key
            })

    elif target_user.role == "Charity":
        # All donations received by charity (no date limit)
        donation_requests = db.query(models.DonationRequest).filter(
            models.DonationRequest.charity_id == target_user_id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
        ).all()

        direct_donations = db.query(models.DirectDonation).filter(
            models.DirectDonation.charity_id == target_user_id,
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at != None,
        ).all()

        for d in donation_requests:
            results.append({
                "id": d.id,
                "type": "request",
                "completed_at": d.tracking_completed_at.strftime("%m-%d-%Y") if d.tracking_completed_at else None,
                "product_name": d.donation_name or (d.inventory_item.name if d.inventory_item else "Unknown"),
                "quantity": d.donation_quantity or 0,
                "bakery_name": d.bakery.name if d.bakery else "Unknown",  # ✅ now shows bakery donor
            })

        for d in direct_donations:
            bakery_name = getattr(getattr(d.bakery_inventory, "bakery", None), "name", "Unknown")
            results.append({
                "id": d.id,
                "type": "direct",
                "completed_at": d.btracking_completed_at.strftime("%m-%d-%Y") if d.btracking_completed_at else None,
                "product_name": d.name,
                "quantity": d.quantity,
                "bakery_name": bakery_name,  # ✅ same naming
            })

    # Sort by most recent first
    results.sort(key=lambda x: x["completed_at"], reverse=True)
    return results

@router.get("/bakery_list")
def bakery_list_report(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_charity)
):
    from collections import defaultdict

    bakeries = defaultdict(lambda: {
        "bakery_name": None,
        "bakery_profile": None,
        "direct_count": 0,
        "request_count": 0,
        "direct_qty": 0,
        "request_qty": 0,
        "total_received_qty": 0,
        "total_transactions": 0,
    })

    # Accepted donation requests
    donation_requests = (
        db.query(models.DonationRequest)
        .join(models.User, models.DonationRequest.bakery_id == models.User.id)
        .filter(
            models.DonationRequest.charity_id == current_user.id,
            models.DonationRequest.tracking_status == "complete"
        )
        .options(joinedload(models.DonationRequest.bakery))
        .all()
    )

    for req in donation_requests:
        if not req.bakery:
            continue
        bid = req.bakery.id
        bakeries[bid]["bakery_name"] = req.bakery.name
        bakeries[bid]["bakery_profile"] = req.bakery.profile_picture
        bakeries[bid]["request_count"] += 1
        bakeries[bid]["request_qty"] += req.donation_quantity or 0

    # Direct donations
    direct_donations = (
        db.query(models.DirectDonation)
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .join(models.User, models.BakeryInventory.bakery_id == models.User.id)
        .filter(
            models.DirectDonation.charity_id == current_user.id,
            models.DirectDonation.btracking_status == "complete"
        )
        .options(joinedload(models.DirectDonation.bakery_inventory))
        .all()
    )

    for d in direct_donations:
        if not d.bakery_inventory or not d.bakery_inventory.bakery:
            continue
        bakery = d.bakery_inventory.bakery
        bid = bakery.id
        bakeries[bid]["bakery_name"] = bakery.name
        bakeries[bid]["bakery_profile"] = bakery.profile_picture
        bakeries[bid]["direct_count"] += 1
        bakeries[bid]["direct_qty"] += d.quantity or 0

    # Totals per bakery
    for b in bakeries.values():
        b["total_received_qty"] = b["direct_qty"] + b["request_qty"]
        b["total_transactions"] = b["direct_count"] + b["request_count"]

    # Grand totals
    grand_totals = {
        "total_direct_count": sum(b["direct_count"] for b in bakeries.values()),
        "total_request_count": sum(b["request_count"] for b in bakeries.values()),
        "total_direct_qty": sum(b["direct_qty"] for b in bakeries.values()),
        "total_request_qty": sum(b["request_qty"] for b in bakeries.values()),
        "total_received_qty": sum(b["total_received_qty"] for b in bakeries.values()),
        "total_transactions": sum(b["total_transactions"] for b in bakeries.values()),
    }

    result = {
        "bakeries": sorted(
            bakeries.values(),
            key=lambda x: x["total_transactions"],
            reverse=True
        ),
        "grand_totals": grand_totals
    }

    return result

@router.get("/summary")
def period_summary(
    period: str = Query("weekly", description="Period type: 'weekly', 'monthly', or 'custom'"),
    start_date: str | None = Query(None, description="Start date YYYY-MM-DD (for weekly or custom)"),
    end_date: str | None = Query(None, description="End date YYYY-MM-DD (for weekly or custom)"),
    month: str | None = Query(None, description="Month YYYY-MM (for monthly), e.g. 2025-09"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_charity)
):
    """
    Combined summary report endpoint that handles weekly, monthly, and custom period reports.
    Use 'period' parameter to switch between 'weekly', 'monthly', and 'custom'.
    
    For weekly: optionally provide start_date and end_date (YYYY-MM-DD)
    For monthly: optionally provide month (YYYY-MM)
    For custom: provide both start_date and end_date (YYYY-MM-DD)
    """
    today = today_ph()
    
    # Determine date range based on period
    if period == "weekly":
        week_start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else today - timedelta(days=7)
        week_end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else today
        period_start = week_start
        period_end = week_end
        period_label = f"{week_start} to {week_end}"
    elif period == "monthly":
        if month:
            try:
                period_start = datetime.strptime(month + "-01", "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM.")
        else:
            period_start = today.replace(day=1)  # first day of current month
        
        # Calculate last day of month
        if period_start.month == 12:
            period_end = period_start.replace(year=period_start.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            period_end = period_start.replace(month=period_start.month + 1, day=1) - timedelta(days=1)
        
        period_label = period_start.strftime("%Y-%m")
    elif period == "custom":
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Custom period requires both start_date and end_date.")
        
        period_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        period_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        if period_end < period_start:
            raise HTTPException(status_code=400, detail="End date must be after or equal to start date.")
        
        period_label = f"{period_start} to {period_end}"
    else:
        raise HTTPException(status_code=400, detail="Invalid period. Use 'weekly', 'monthly', or 'custom'.")
    
    # Include full end date by adding 1 day
    period_end_inclusive = period_end + timedelta(days=1)

    # --- Direct Donations (completed in period) ---
    direct_donations = (
        db.query(func.coalesce(func.sum(models.DirectDonation.quantity), 0))
        .filter(
            models.DirectDonation.charity_id == current_user.id,
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at != None,
            models.DirectDonation.btracking_completed_at >= period_start,
            models.DirectDonation.btracking_completed_at < period_end_inclusive
        )
        .scalar()
    )

    # Count of direct donation transactions
    direct_count = (
        db.query(func.count(models.DirectDonation.id))
        .filter(
            models.DirectDonation.charity_id == current_user.id,
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at != None,
            models.DirectDonation.btracking_completed_at >= period_start,
            models.DirectDonation.btracking_completed_at < period_end_inclusive
        )
        .scalar() or 0
    )

    # --- Donation Requests (completed in period) ---
    request_donations = (
        db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0))
        .filter(
            models.DonationRequest.charity_id == current_user.id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
            models.DonationRequest.tracking_completed_at >= period_start,
            models.DonationRequest.tracking_completed_at < period_end_inclusive
        )
        .scalar()
    )

    # Count of donation request transactions
    request_count = (
        db.query(func.count(models.DonationRequest.id))
        .filter(
            models.DonationRequest.charity_id == current_user.id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
            models.DonationRequest.tracking_completed_at >= period_start,
            models.DonationRequest.tracking_completed_at < period_end_inclusive
        )
        .scalar() or 0
    )

    # --- Top donated items ---
    top_items = (
        db.query(
            models.DonationRequest.donation_name.label("product_name"),
            func.sum(models.DonationRequest.donation_quantity).label("quantity"),
        )
        .filter(
            models.DonationRequest.charity_id == current_user.id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
            models.DonationRequest.tracking_completed_at >= period_start,
            models.DonationRequest.tracking_completed_at < period_end_inclusive
        )
        .group_by(models.DonationRequest.donation_name)
        .union_all(
            db.query(
                models.DirectDonation.name.label("product_name"),
                func.sum(models.DirectDonation.quantity).label("quantity"),
            )
            .filter(
                models.DirectDonation.charity_id == current_user.id,
                models.DirectDonation.btracking_status == "complete",
                models.DirectDonation.btracking_completed_at != None,
                models.DirectDonation.btracking_completed_at >= period_start,
                models.DirectDonation.btracking_completed_at < period_end_inclusive
            )
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

    # Build response based on period type
    response = {
        "charity_id": current_user.id,
        "charity_name": current_user.name,
        "period": period,
        "period_label": period_label,
        "total_direct_donations": direct_donations or 0,
        "total_request_donations": request_donations or 0,
        "total_donations": (direct_donations or 0) + (request_donations or 0),
        "total_transactions": direct_count + request_count,
        "top_items": top_10_items
    }
    
    # Add period-specific fields
    if period == "weekly":
        response["week_start"] = str(period_start)
        response["week_end"] = str(period_end)
    elif period == "monthly":
        response["month"] = period_start.strftime("%Y-%m")
    elif period == "custom":
        response["start_date"] = str(period_start)
        response["end_date"] = str(period_end)
    
    return response

@router.get("/weekly")
def weekly_summary(
    start_date: str | None = Query(None, description="Week start date YYYY-MM-DD"),
    end_date: str | None = Query(None, description="Week end date YYYY-MM-DD"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_charity)
):
    today = today_ph()
    week_start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else today - timedelta(days=7)
    week_end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else today

    # include full end date by adding 1 day
    week_end_inclusive = week_end + timedelta(days=1)

    # --- Direct Donations (completed this week) ---
    direct_donations = (
        db.query(func.coalesce(func.sum(models.DirectDonation.quantity), 0))
        .filter(
            models.DirectDonation.charity_id == current_user.id,
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at != None,
            models.DirectDonation.btracking_completed_at >= week_start,
            models.DirectDonation.btracking_completed_at < week_end_inclusive
        )
        .scalar()
    )

    # Count of direct donation transactions
    direct_count = (
        db.query(func.count(models.DirectDonation.id))
        .filter(
            models.DirectDonation.charity_id == current_user.id,
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at != None,
            models.DirectDonation.btracking_completed_at >= week_start,
            models.DirectDonation.btracking_completed_at < week_end_inclusive
        )
        .scalar() or 0
    )

    # --- Donation Requests (completed this week) ---
    request_donations = (
        db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0))
        .filter(
            models.DonationRequest.charity_id == current_user.id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
            models.DonationRequest.tracking_completed_at >= week_start,
            models.DonationRequest.tracking_completed_at < week_end_inclusive
        )
        .scalar()
    )

    # Count of donation request transactions
    request_count = (
        db.query(func.count(models.DonationRequest.id))
        .filter(
            models.DonationRequest.charity_id == current_user.id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
            models.DonationRequest.tracking_completed_at >= week_start,
            models.DonationRequest.tracking_completed_at < week_end_inclusive
        )
        .scalar() or 0
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
        .filter(
            models.DonationRequest.charity_id == current_user.id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
            models.DonationRequest.tracking_completed_at >= week_start,
            models.DonationRequest.tracking_completed_at < week_end_inclusive
        )
        .group_by(models.DonationRequest.donation_name)
        .union_all(
            db.query(
                models.DirectDonation.name.label("product_name"),
                func.sum(models.DirectDonation.quantity).label("quantity"),
            )
            .filter(
                models.DirectDonation.charity_id == current_user.id,
                models.DirectDonation.btracking_status == "complete",
                models.DirectDonation.btracking_completed_at != None,
                models.DirectDonation.btracking_completed_at >= week_start,
                models.DirectDonation.btracking_completed_at < week_end_inclusive
            )
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
        "total_transactions": direct_count + request_count,
        "top_items": top_10_items,
        "expired_products": expired_total,
        "available_products": available_total 
    }


@router.get("/monthly")
def monthly_summary(
    month: str | None = Query(None, description="Month YYYY-MM, e.g. 2025-09"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_charity)
):
    today = today_ph()
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

    # --- Direct Donations (completed this month) ---
    direct_donations = (
        db.query(func.coalesce(func.sum(models.DirectDonation.quantity), 0))
        .filter(
            models.DirectDonation.charity_id == current_user.id,
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at != None,
            models.DirectDonation.btracking_completed_at >= start_date,
            models.DirectDonation.btracking_completed_at < end_date_inclusive
        )
        .scalar()
    )

    # Count of direct donation transactions
    direct_count = (
        db.query(func.count(models.DirectDonation.id))
        .filter(
            models.DirectDonation.charity_id == current_user.id,
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at != None,
            models.DirectDonation.btracking_completed_at >= start_date,
            models.DirectDonation.btracking_completed_at < end_date_inclusive
        )
        .scalar() or 0
    )

    # --- Donation Requests (completed this month) ---
    request_donations = (
        db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0))
        .filter(
            models.DonationRequest.charity_id == current_user.id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
            models.DonationRequest.tracking_completed_at >= start_date,
            models.DonationRequest.tracking_completed_at < end_date_inclusive
        )
        .scalar()
    )

    # Count of donation request transactions
    request_count = (
        db.query(func.count(models.DonationRequest.id))
        .filter(
            models.DonationRequest.charity_id == current_user.id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at != None,
            models.DonationRequest.tracking_completed_at >= start_date,
            models.DonationRequest.tracking_completed_at < end_date_inclusive
        )
        .scalar() or 0
    )

    # --- Top donated items (completed this month) ---
    top_items = (
        db.query(
            models.DonationRequest.donation_name.label("product_name"),
            func.sum(models.DonationRequest.donation_quantity).label("quantity"),
        )
        .filter(models.DonationRequest.bakery_id == current_user.id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.tracking_completed_at != None)
        .filter(models.DonationRequest.tracking_completed_at >= start_date,
                models.DonationRequest.tracking_completed_at < end_date_inclusive)
        .group_by(models.DonationRequest.donation_name)
        .union_all(
            db.query(
                models.DirectDonation.name.label("product_name"),
                func.sum(models.DirectDonation.quantity).label("quantity"),
            )
            .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
            .filter(models.BakeryInventory.bakery_id == current_user.id)
            .filter(models.DirectDonation.btracking_status == "complete")
            .filter(models.DirectDonation.btracking_completed_at != None)
            .filter(models.DirectDonation.btracking_completed_at >= start_date,
                    models.DirectDonation.btracking_completed_at < end_date_inclusive)
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
        "total_transactions": direct_count + request_count,
        "expired_products": expired_total,
        "available_products": available_total,
        "top_items": top_10_items
    }

@router.get("/charity-info")
def charity_info(current_user: models.User = Depends(check_charity)):
    return {
        "profile": current_user.profile_picture,
        "name": current_user.name,
        "address": current_user.address,
        "contact_number": current_user.contact_number,
        "email": current_user.email
    } 
