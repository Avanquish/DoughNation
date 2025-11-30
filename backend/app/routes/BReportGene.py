from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app import database, models, auth
from datetime import datetime, timedelta
from app.timezone_utils import now_ph, today_ph

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

def check_bakery_or_employee(current_auth = Depends(auth.get_current_user_or_employee)):
    """Allow both bakery owners and employees to access reports"""
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    return current_auth, bakery_id

from sqlalchemy.orm import joinedload

@router.get("/donation_history")
def donation_history(
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    auth_data = Depends(check_bakery_or_employee),  # Allow bakeries and employees
):
    current_auth, bakery_id = auth_data
    results = []

    # Parse date filters if provided
    date_start = None
    date_end = None
    if start_date:
        date_start = datetime.strptime(start_date, "%Y-%m-%d").date()
    if end_date:
        date_end = datetime.strptime(end_date, "%Y-%m-%d").date()

    # For bakeries — donations they sent
    query_requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_id == bakery_id,
        models.DonationRequest.tracking_status == "complete",
        models.DonationRequest.tracking_completed_at != None,
    )
    
    # Apply date filters if provided
    if date_start:
        query_requests = query_requests.filter(
            func.date(models.DonationRequest.tracking_completed_at) >= date_start
        )
    if date_end:
        query_requests = query_requests.filter(
            func.date(models.DonationRequest.tracking_completed_at) <= date_end
        )
    
    donation_requests = (
        query_requests
        .options(
            joinedload(models.DonationRequest.charity),
            joinedload(models.DonationRequest.inventory_item)
        )
        .all()
    )

    query_direct = (
        db.query(models.DirectDonation)
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at != None,
        )
    )
    
    # Apply date filters if provided
    if date_start:
        query_direct = query_direct.filter(
            func.date(models.DirectDonation.btracking_completed_at) >= date_start
        )
    if date_end:
        query_direct = query_direct.filter(
            func.date(models.DirectDonation.btracking_completed_at) <= date_end
        )
    
    direct_donations = (
        query_direct
        .options(
            joinedload(models.DirectDonation.charity),
            joinedload(models.DirectDonation.bakery_inventory)
        )
        .all()
    )

    # Add donation requests
    for d in donation_requests:
        results.append({
            "id": d.id,
            "type": "request",
            "completed_at": d.tracking_completed_at.strftime("%m-%d-%Y") if d.tracking_completed_at else None,
            "product_name": (
                d.donation_name or (d.inventory_item.name if d.inventory_item else "Unknown")
            ),
            "quantity": d.donation_quantity or 0,
            "charity_name": d.charity.name if d.charity else "Unknown",
            "donated_by": d.rdonated_by or "Unknown",
        })

    # Add direct donations
    for d in direct_donations:
        results.append({
            "id": d.id,
            "type": "direct",
            "completed_at": d.btracking_completed_at.strftime("%m-%d-%Y") if d.btracking_completed_at else None,
            "product_name": d.name or "Unknown",
            "quantity": d.quantity or 0,
            "charity_name": d.charity.name if d.charity else "Unknown",
            "donated_by": d.donated_by or "Unknown",  
        })

    # Sort latest first
    results.sort(key=lambda x: x["completed_at"], reverse=True)

    return results

@router.get("/expiry_loss")
def expiry_loss_report(
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    current_auth, bakery_id = auth_data
    
    # Parse date filters if provided
    date_start = None
    date_end = None
    if start_date:
        date_start = datetime.strptime(start_date, "%Y-%m-%d").date()
    if end_date:
        date_end = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    query = (
        db.query(models.BakeryInventory)
        .options(
            joinedload(models.BakeryInventory.bakery)  # join bakery relationship
        )
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.BakeryInventory.expiration_date < now_ph(),
            models.BakeryInventory.status != "donated",
        )
    )
    
    # Apply date filters on expiration_date if provided
    if date_start:
        query = query.filter(
            func.date(models.BakeryInventory.expiration_date) >= date_start
        )
    if date_end:
        query = query.filter(
            func.date(models.BakeryInventory.expiration_date) <= date_end
        )
    
    expired = query.all()

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

@router.get("/top_items")
def top_donated_items(
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    current_auth, bakery_id = auth_data
    
    # Parse date filters if provided
    date_start = None
    date_end = None
    if start_date:
        date_start = datetime.strptime(start_date, "%Y-%m-%d").date()
    if end_date:
        date_end = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    # --- Direct donations (only complete) ---
    query_direct = (
        db.query(
            models.DirectDonation.name.label("product_name"),
            func.sum(models.DirectDonation.quantity).label("quantity"),
        )
        .join(
            models.BakeryInventory,
            models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id,
        )
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .filter(models.DirectDonation.btracking_status == "complete")
    )
    
    # Apply date filters if provided
    if date_start:
        query_direct = query_direct.filter(
            func.date(models.DirectDonation.btracking_completed_at) >= date_start
        )
    if date_end:
        query_direct = query_direct.filter(
            func.date(models.DirectDonation.btracking_completed_at) <= date_end
        )
    
    direct_items = query_direct.group_by(models.DirectDonation.name).all()

    # --- Donation requests (only complete) ---
    query_requests = (
        db.query(
            models.DonationRequest.donation_name.label("product_name"),
            func.sum(models.DonationRequest.donation_quantity).label("quantity"),
        )
        .filter(models.DonationRequest.bakery_id == bakery_id)
        .filter(models.DonationRequest.tracking_status == "complete")
    )
    
    # Apply date filters if provided
    if date_start:
        query_requests = query_requests.filter(
            func.date(models.DonationRequest.tracking_completed_at) >= date_start
        )
    if date_end:
        query_requests = query_requests.filter(
            func.date(models.DonationRequest.tracking_completed_at) <= date_end
        )
    
    request_items = query_requests.group_by(models.DonationRequest.donation_name).all()

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

@router.get("/charity_list")
def charity_list_report(
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    current_auth, bakery_id = auth_data
    from collections import defaultdict
    
    # Parse date filters if provided
    date_start = None
    date_end = None
    if start_date:
        date_start = datetime.strptime(start_date, "%Y-%m-%d").date()
    if end_date:
        date_end = datetime.strptime(end_date, "%Y-%m-%d").date()

    charities = defaultdict(lambda: {
        "charity_name": None,
        "charity_profile": None,
        "direct_count": 0,
        "request_count": 0,
        "direct_qty": 0,
        "request_qty": 0,
        "total_received_qty": 0,
        "total_transactions": 0,
    })

    # Accepted donation requests
    query_requests = (
        db.query(models.DonationRequest)
        .join(models.User, models.DonationRequest.charity_id == models.User.id)
        .filter(
            models.DonationRequest.bakery_id == bakery_id,
            models.DonationRequest.tracking_status == "complete"
        )
        .options(joinedload(models.DonationRequest.charity))
    )
    
    # Apply date filters if provided
    if date_start:
        query_requests = query_requests.filter(
            func.date(models.DonationRequest.tracking_completed_at) >= date_start
        )
    if date_end:
        query_requests = query_requests.filter(
            func.date(models.DonationRequest.tracking_completed_at) <= date_end
        )
    
    donation_requests = query_requests.all()

    for req in donation_requests:
        if not req.charity:
            continue
        cid = req.charity.id
        charities[cid]["charity_name"] = req.charity.name
        charities[cid]["charity_profile"] = req.charity.profile_picture
        charities[cid]["request_count"] += 1
        #Use correct field name
        charities[cid]["request_qty"] += req.donation_quantity or 0

    # Direct donations
    query_direct = (
        db.query(models.DirectDonation)
        .join(models.User, models.DirectDonation.charity_id == models.User.id)
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == bakery_id,
                models.DirectDonation.btracking_status == "complete"
        )
        .options(joinedload(models.DirectDonation.charity))
    )
    
    # Apply date filters if provided
    if date_start:
        query_direct = query_direct.filter(
            func.date(models.DirectDonation.btracking_completed_at) >= date_start
        )
    if date_end:
        query_direct = query_direct.filter(
            func.date(models.DirectDonation.btracking_completed_at) <= date_end
        )
    
    direct_donations = query_direct.all()

    for d in direct_donations:
        if not d.charity:
            continue
        cid = d.charity.id
        charities[cid]["charity_name"] = d.charity.name
        charities[cid]["charity_profile"] = d.charity.profile_picture
        charities[cid]["direct_count"] += 1
        charities[cid]["direct_qty"] += d.quantity or 0

    #Totals per charity
    for c in charities.values():
        c["total_received_qty"] = c["direct_qty"] + c["request_qty"]
        c["total_transactions"] = c["direct_count"] + c["request_count"]

    #Grand totals
    grand_totals = {
        "total_direct_count": sum(c["direct_count"] for c in charities.values()),
        "total_request_count": sum(c["request_count"] for c in charities.values()),
        "total_direct_qty": sum(c["direct_qty"] for c in charities.values()),
        "total_request_qty": sum(c["request_qty"] for c in charities.values()),
        "total_received_qty": sum(c["total_received_qty"] for c in charities.values()),
        "total_transactions": sum(c["total_transactions"] for c in charities.values()),
    }

    result = {
        "charities": sorted(
            charities.values(),
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
    auth_data = Depends(check_bakery_or_employee)
):
    """
    Combined summary report endpoint that handles weekly, monthly, and custom period reports.
    Use 'period' parameter to switch between 'weekly', 'monthly', or 'custom'.
    
    For weekly: optionally provide start_date and end_date (YYYY-MM-DD)
    For monthly: optionally provide month (YYYY-MM)
    For custom: provide both start_date and end_date (YYYY-MM-DD) - no date range limitations
    """
    current_auth, bakery_id = auth_data
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
        # Custom period requires both start_date and end_date
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Custom period requires both start_date and end_date.")
        
        period_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        period_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        # Validate that end_date is not before start_date
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
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .filter(models.DirectDonation.btracking_status == "complete")
        .filter(models.DirectDonation.btracking_completed_at != None)
        .filter(models.DirectDonation.btracking_completed_at >= period_start,
                models.DirectDonation.btracking_completed_at < period_end_inclusive)
        .scalar()
    )

    # --- Donation Requests (completed in period) ---
    request_donations = (
        db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0))
        .filter(models.DonationRequest.bakery_id == bakery_id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.tracking_completed_at != None)
        .filter(models.DonationRequest.tracking_completed_at >= period_start,
                models.DonationRequest.tracking_completed_at < period_end_inclusive)
        .scalar()
    )

    # --- Expired products (exclude donated/complete items) ---
    expired_total = (
        db.query(func.sum(models.BakeryInventory.quantity))
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .filter(models.BakeryInventory.status != "donated")
        .filter(models.BakeryInventory.expiration_date >= period_start,
                models.BakeryInventory.expiration_date < period_end_inclusive)
        .scalar() or 0
    )
    
    # --- Available products (not expired, not donated/complete) ---
    available_total = (
        db.query(func.sum(models.BakeryInventory.quantity))
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .filter(models.BakeryInventory.status == "available")
        .filter(models.BakeryInventory.expiration_date >= period_start,
                models.BakeryInventory.expiration_date < period_end_inclusive)
        .scalar() or 0
    )

    # --- Top donated items ---
    top_items = (
        db.query(
            models.DonationRequest.donation_name.label("product_name"),
            func.sum(models.DonationRequest.donation_quantity).label("quantity"),
        )
        .filter(models.DonationRequest.bakery_id == bakery_id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.tracking_completed_at != None)
        .filter(models.DonationRequest.tracking_completed_at >= period_start,
                models.DonationRequest.tracking_completed_at < period_end_inclusive)
        .group_by(models.DonationRequest.donation_name)
        .union_all(
            db.query(
                models.DirectDonation.name.label("product_name"),
                func.sum(models.DirectDonation.quantity).label("quantity"),
            )
            .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
            .filter(models.BakeryInventory.bakery_id == bakery_id)
            .filter(models.DirectDonation.btracking_status == "complete")
            .filter(models.DirectDonation.btracking_completed_at != None)
            .filter(models.DirectDonation.btracking_completed_at >= period_start,
                    models.DirectDonation.btracking_completed_at < period_end_inclusive)
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
    
    # Get bakery name
    if isinstance(current_auth, dict):
        bakery_user = db.query(models.User).filter(models.User.id == bakery_id).first()
        bakery_name = bakery_user.name if bakery_user else "Unknown"
    else:
        bakery_name = current_auth.name

    # Build response based on period type
    response = {
        "bakery_id": bakery_id,
        "bakery_name": bakery_name,
        "period": period,
        "period_label": period_label,
        "total_direct_donations": direct_donations or 0,
        "total_request_donations": request_donations or 0,
        "total_donations": (direct_donations or 0) + (request_donations or 0),
        "top_items": top_10_items,
        "expired_products": expired_total,
        "available_products": available_total
    }
    
    # Add period-specific fields
    if period == "weekly":
        response["week_start"] = str(period_start)
        response["week_end"] = str(period_end)
    elif period == "monthly":
        response["month"] = period_start.strftime("%Y-%m")
    
    return response


@router.get("/weekly")
def weekly_summary(
    start_date: str | None = Query(None, description="Week start date YYYY-MM-DD"),
    end_date: str | None = Query(None, description="Week end date YYYY-MM-DD"),
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    """Deprecated: Use /summary with period=weekly instead"""
    current_auth, bakery_id = auth_data
    today = today_ph()
    week_start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else today - timedelta(days=7)
    week_end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else today

    # include full end date by adding 1 day
    week_end_inclusive = week_end + timedelta(days=1)

    # --- Direct Donations (completed this week) ---
    direct_donations = (
        db.query(func.coalesce(func.sum(models.DirectDonation.quantity), 0))
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .filter(models.DirectDonation.btracking_status == "complete")
        .filter(models.DirectDonation.btracking_completed_at != None)
        .filter(models.DirectDonation.btracking_completed_at >= week_start,
                models.DirectDonation.btracking_completed_at < week_end_inclusive)
        .scalar()
    )

    # --- Donation Requests (completed this week) ---
    request_donations = (
        db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0))
        .filter(models.DonationRequest.bakery_id == bakery_id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.tracking_completed_at != None)
        .filter(models.DonationRequest.tracking_completed_at >= week_start,
                models.DonationRequest.tracking_completed_at < week_end_inclusive)
        .scalar()
    )

    # --- Expired products (exclude donated/complete items) ---
    expired_total = (
        db.query(func.sum(models.BakeryInventory.quantity))
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .filter(models.BakeryInventory.status != "donated")   # or "complete"
        .filter(models.BakeryInventory.expiration_date >= period_start,
                models.BakeryInventory.expiration_date < period_end_inclusive)
        .scalar() or 0
    )
    
    # --- Available products (not expired, not donated/complete) ---
    available_total = (
        db.query(func.sum(models.BakeryInventory.quantity))
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .filter(models.BakeryInventory.status == "available")
        .filter(models.BakeryInventory.expiration_date >= period_start,
                models.BakeryInventory.expiration_date < period_end_inclusive)
        .scalar() or 0
    )

    # --- Top donated items ---
    top_items = (
        db.query(
            models.DonationRequest.donation_name.label("product_name"),
            func.sum(models.DonationRequest.donation_quantity).label("quantity"),
        )
        .filter(models.DonationRequest.bakery_id == bakery_id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.tracking_completed_at != None)
        .filter(models.DonationRequest.tracking_completed_at >= week_start,
                models.DonationRequest.tracking_completed_at < week_end_inclusive)
        .group_by(models.DonationRequest.donation_name)
        .union_all(
            db.query(
                models.DirectDonation.name.label("product_name"),
                func.sum(models.DirectDonation.quantity).label("quantity"),
            )
            .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
            .filter(models.BakeryInventory.bakery_id == bakery_id)
            .filter(models.DirectDonation.btracking_status == "complete")
            .filter(models.DirectDonation.btracking_completed_at != None)
            .filter(models.DirectDonation.btracking_completed_at >= week_start,
                    models.DirectDonation.btracking_completed_at < week_end_inclusive)
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
    
    # Get bakery name
    if isinstance(current_auth, dict):
        bakery_user = db.query(models.User).filter(models.User.id == bakery_id).first()
        bakery_name = bakery_user.name if bakery_user else "Unknown"
    else:
        bakery_name = current_auth.name

    # Build response based on period type
    response = {
        "bakery_id": bakery_id,
        "bakery_name": bakery_name,
        "period": period,
        "total_direct_donations": direct_donations or 0,
        "total_request_donations": request_donations or 0,
        "total_donations": (direct_donations or 0) + (request_donations or 0),
        "top_items": top_10_items,
        "expired_products": expired_total,
        "available_products": available_total 
    }
    
    # Add period-specific fields
    if period == "weekly":
        response["week_start"] = str(period_start)
        response["week_end"] = str(period_end)
    elif period == "monthly":
        response["month"] = period_label
    elif period == "custom":
        response["start_date"] = str(period_start)
        response["end_date"] = str(period_end)
    
    return response


@router.get("/monthly")
def monthly_summary(
    month: str | None = Query(None, description="Month YYYY-MM, e.g. 2025-09"),
    db: Session = Depends(database.get_db),
    auth_data = Depends(check_bakery_or_employee)
):
    """Deprecated: Use /summary with period=monthly instead"""
    current_auth, bakery_id = auth_data
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
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .filter(models.DirectDonation.btracking_status == "complete")
        .filter(models.DirectDonation.btracking_completed_at != None)
        .filter(models.DirectDonation.btracking_completed_at >= start_date,
                models.DirectDonation.btracking_completed_at < end_date_inclusive)
        .scalar()
    )

    # --- Donation Requests (completed this month) ---
    request_donations = (
        db.query(func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0))
        .filter(models.DonationRequest.bakery_id == bakery_id)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.tracking_completed_at != None)
        .filter(models.DonationRequest.tracking_completed_at >= start_date,
                models.DonationRequest.tracking_completed_at < end_date_inclusive)
        .scalar()
    )

    # --- Top donated items (completed this month) ---
    top_items = (
        db.query(
            models.DonationRequest.donation_name.label("product_name"),
            func.sum(models.DonationRequest.donation_quantity).label("quantity"),
        )
        .filter(models.DonationRequest.bakery_id == bakery_id)
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
            .filter(models.BakeryInventory.bakery_id == bakery_id)
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
        .filter(models.BakeryInventory.bakery_id == bakery_id)
        .filter(models.BakeryInventory.status != "donated")
        .filter(models.BakeryInventory.expiration_date >= start_date,
                models.BakeryInventory.expiration_date < end_date_inclusive)
        .scalar() or 0
    )

    available_total = (
        db.query(func.sum(models.BakeryInventory.quantity))
        .filter(models.BakeryInventory.bakery_id == bakery_id)
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
    
    # Get bakery name
    if isinstance(current_auth, dict):
        bakery_user = db.query(models.User).filter(models.User.id == bakery_id).first()
        bakery_name = bakery_user.name if bakery_user else "Unknown"
    else:
        bakery_name = current_auth.name

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
def bakery_info(auth_data = Depends(check_bakery_or_employee), db: Session = Depends(database.get_db)):
    current_auth, bakery_id = auth_data
    
    # If it's an employee, fetch the bakery user info
    if isinstance(current_auth, dict):
        bakery_user = db.query(models.User).filter(models.User.id == bakery_id).first()
        if not bakery_user:
            raise HTTPException(status_code=404, detail="Bakery not found")
        current_user = bakery_user
    else:
        current_user = current_auth
    
    return {
        "profile": current_user.profile_picture,
        "name": current_user.name,
        "address": current_user.address,
        "contact_number": current_user.contact_number,
        "email": current_user.email
    }