from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, time, timedelta
from app.auth import get_current_user
from .. import models, schemas, database
from ..database import get_db

router = APIRouter(prefix="/users", tags=["User Stats"])

# ---------- Helper: Unlock badge ----------
def unlock_badge(db: Session, user_id: int, name: str, image: str):
    badge = db.query(models.Badge).filter(
        models.Badge.user_id == user_id,
        models.Badge.name == name
    ).first()

    if not badge:
        badge = models.Badge(
            user_id=user_id,
            name=name,
            image=image,
            unlocked=True
        )
        db.add(badge)
        db.commit()
        db.refresh(badge)
    elif not badge.unlocked:
        badge.unlocked = True
        db.commit()

@router.get("/{user_id}/stats")
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ---------------- Donations already made (status = completed) ----------------
    # From DonationRequests
    request_donations = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_id == user_id,
        models.DonationRequest.tracking_status == "complete"
    ).all()

    # From DirectDonations
    direct_donations = db.query(models.DirectDonation).join(
        models.BakeryInventory,
        models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id
    ).filter(models.BakeryInventory.bakery_id == user_id).all()

    all_donations = request_donations + direct_donations

    total_donations = len(all_donations)
    total_items = sum(
        d.donation_quantity if isinstance(d, models.DonationRequest) else d.quantity
        for d in all_donations
        if (d.donation_quantity if isinstance(d, models.DonationRequest) else d.quantity)
    )

    # ---------------- Charities served ----------------
    request_charities = db.query(models.DonationRequest.charity_id).filter(
        models.DonationRequest.bakery_id == user_id,
        models.DonationRequest.tracking_status == "complete"
    ).distinct()

    direct_charities = db.query(models.DirectDonation.charity_id).join(
        models.BakeryInventory,
        models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id
    ).filter(models.BakeryInventory.bakery_id == user_id).distinct()

    unique_charities = len(set([c[0] for c in request_charities.union(direct_charities)]))

    # ---------------- Donation streak ----------------
    donation_dates = sorted([
        d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date
        for d in all_donations
        if (d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date)
    ])

    streak_days = 0
    if donation_dates:
        streak_days = 1
        for i in range(len(donation_dates) - 1, 0, -1):
            if (donation_dates[i].date() - donation_dates[i - 1].date()).days == 1:
                streak_days += 1
            else:
                break

    # ---------------- Freshness (before expiration) ----------------
    freshness_count = 0
    for d in all_donations:
        created = d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date
        expiration = d.donation_expiration if isinstance(d, models.DonationRequest) else d.expiration_date
        if created and expiration and created < expiration:
            freshness_count += 1
    freshness_percent = int((freshness_count / total_donations) * 100) if total_donations > 0 else 0

    # ---------------- Active months ----------------
    first_donation = donation_dates[0] if donation_dates else None
    months_active = (
        (datetime.now().year - first_donation.year) * 12 +
        (datetime.now().month - first_donation.month) + 1
    ) if first_donation else 0

    # ---------------- Timeliness & Freshness Badges ----------------
    early_donations = sum(
        1 for d in all_donations
        if (d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date).time() < time(9, 0)
    )
    on_time_donations = freshness_count

    # ---------------- Seasonal / Special Event Badges ----------------
    holiday_donations = sum(
        1 for d in all_donations
        if (d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date) and
           ((d.timestamp.month == 12 and 18 <= d.timestamp.day <= 31) or
            (d.timestamp.month == 1 and 1 <= d.timestamp.day <= 7))
    )
    valentine_donations = sum(
        1 for d in all_donations
        if (d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date).month == 2 and
           (d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date).day == 14
    )
    ramadan_start = date(2026, 2, 17)
    ramadan_end = date(2026, 3, 19)
    ramadan_donations = sum(
        1 for d in all_donations
        if ramadan_start <= (d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date).date() <= ramadan_end
    )
    world_hunger_day_donations = sum(
        1 for d in all_donations
        if (d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date).month == 10 and
           (d.timestamp if isinstance(d, models.DonationRequest) else d.creation_date).day == 16
    )

    # ---------------- Collaboration & Recognition ----------------
    collaborations = sum(
        1 for d in request_donations
        if d.inventory_item and getattr(d.inventory_item, "collaboration_with_other_bakery", False)
    )
    charity_recognitions = sum(
        1 for d in all_donations
        if getattr(d, "charity_recognized", False)
    )

    # --- Top Recognition Badges ---
    monthly_top = 0
    quarterly_top = 0
    yearly_top = 0

    # Define date ranges
    now = datetime.now()
    current_month = now.month
    current_year = now.year

    month_start = datetime(current_year, current_month, 1)

    current_quarter = (current_month - 1) // 3 + 1
    quarter_start_month = (current_quarter - 1) * 3 + 1
    quarter_start = datetime(current_year, quarter_start_month, 1)

    year_start = datetime(current_year, 1, 1)

    # --- Donations made this month ---
    monthly_requests = db.query(func.sum(models.DonationRequest.donation_quantity)) \
        .filter(
            models.DonationRequest.bakery_id == user_id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.timestamp >= month_start
        ).scalar() or 0

    monthly_directs = db.query(func.sum(models.DirectDonation.quantity)) \
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id) \
        .filter(
            models.BakeryInventory.bakery_id == user_id,
            models.DirectDonation.creation_date >= month_start
        ).scalar() or 0

    user_monthly_qty = monthly_requests + monthly_directs

    # Get max across all bakeries
    all_monthly = db.query(
        models.DonationRequest.bakery_id,
        func.sum(models.DonationRequest.donation_quantity).label("total")
    ).filter(
        models.DonationRequest.tracking_status == "complete",
        models.DonationRequest.timestamp >= month_start
    ).group_by(models.DonationRequest.bakery_id).all()

    all_monthly_directs = db.query(
        models.BakeryInventory.bakery_id,
        func.sum(models.DirectDonation.quantity).label("total")
    ).join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id) \
     .filter(models.DirectDonation.creation_date >= month_start) \
     .group_by(models.BakeryInventory.bakery_id).all()

    monthly_totals = {}
    for row in all_monthly:
        monthly_totals[row.bakery_id] = monthly_totals.get(row.bakery_id, 0) + (row.total or 0)
    for row in all_monthly_directs:
        monthly_totals[row.bakery_id] = monthly_totals.get(row.bakery_id, 0) + (row.total or 0)

    if monthly_totals and user_monthly_qty == max(monthly_totals.values()):
        monthly_top = 1

    # --- Quarterly Donations ---
    quarterly_requests = db.query(func.sum(models.DonationRequest.donation_quantity)) \
        .filter(
            models.DonationRequest.bakery_id == user_id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.timestamp >= quarter_start
        ).scalar() or 0

    quarterly_directs = db.query(func.sum(models.DirectDonation.quantity)) \
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id) \
        .filter(
            models.BakeryInventory.bakery_id == user_id,
            models.DirectDonation.creation_date >= quarter_start
        ).scalar() or 0

    user_quarterly_qty = quarterly_requests + quarterly_directs

    # Aggregate for all bakeries
    quarterly_totals = {}
    all_quarterly = db.query(
        models.DonationRequest.bakery_id,
        func.sum(models.DonationRequest.donation_quantity).label("total")
    ).filter(
        models.DonationRequest.tracking_status == "complete",
        models.DonationRequest.timestamp >= quarter_start
    ).group_by(models.DonationRequest.bakery_id).all()

    all_quarterly_directs = db.query(
        models.BakeryInventory.bakery_id,
        func.sum(models.DirectDonation.quantity).label("total")
    ).join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id) \
     .filter(models.DirectDonation.creation_date >= quarter_start) \
     .group_by(models.BakeryInventory.bakery_id).all()

    for row in all_quarterly:
        quarterly_totals[row.bakery_id] = quarterly_totals.get(row.bakery_id, 0) + (row.total or 0)
    for row in all_quarterly_directs:
        quarterly_totals[row.bakery_id] = quarterly_totals.get(row.bakery_id, 0) + (row.total or 0)

    if quarterly_totals and user_quarterly_qty == max(quarterly_totals.values()):
        quarterly_top = 1

    # --- Yearly Donations ---
    yearly_requests = db.query(func.sum(models.DonationRequest.donation_quantity)) \
        .filter(
            models.DonationRequest.bakery_id == user_id,
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.timestamp >= year_start
        ).scalar() or 0

    yearly_directs = db.query(func.sum(models.DirectDonation.quantity)) \
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id) \
        .filter(
            models.BakeryInventory.bakery_id == user_id,
            models.DirectDonation.creation_date >= year_start
        ).scalar() or 0

    user_yearly_qty = yearly_requests + yearly_directs

    yearly_totals = {}
    all_yearly = db.query(
        models.DonationRequest.bakery_id,
        func.sum(models.DonationRequest.donation_quantity).label("total")
    ).filter(
        models.DonationRequest.tracking_status == "complete",
        models.DonationRequest.timestamp >= year_start
    ).group_by(models.DonationRequest.bakery_id).all()

    all_yearly_directs = db.query(
        models.BakeryInventory.bakery_id,
        func.sum(models.DirectDonation.quantity).label("total")
    ).join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id) \
     .filter(models.DirectDonation.creation_date >= year_start) \
     .group_by(models.BakeryInventory.bakery_id).all()

    for row in all_yearly:
        yearly_totals[row.bakery_id] = yearly_totals.get(row.bakery_id, 0) + (row.total or 0)
    for row in all_yearly_directs:
        yearly_totals[row.bakery_id] = yearly_totals.get(row.bakery_id, 0) + (row.total or 0)

    if yearly_totals and user_yearly_qty == max(yearly_totals.values()):
        yearly_top = 1


    return {
        "donations": total_donations,
        "items": total_items,
        "peopleServed": unique_charities,
        "streakDays": streak_days,
        "charities": unique_charities,
        "freshnessPercent": freshness_percent,
        "months": months_active,

        # Timeliness & Freshness
        "earlyDonations": early_donations,
        "onTimeDonations": on_time_donations,

        # Seasonal / Special
        "holidayDonations": holiday_donations,
        "valentineDonations": valentine_donations,
        "ramadanDonations": ramadan_donations,
        "worldHungerDayDonations": world_hunger_day_donations,

        # Collaboration / Recognition
        "collaborations": collaborations,
        "charityRecognitions": charity_recognitions,

        # Top Recognition
        "monthlyTop": monthly_top,
        "quarterlyTop": quarterly_top,
        "legendaryStatus": yearly_top
    }


@router.get("/users/{user_id}/badges")
def get_user_badges(user_id: int, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != "Bakery":
        raise HTTPException(status_code=400, detail="Badges are only for bakery users")

    # Count all donations made by this bakery (requests + direct)
    total_requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_id == user_id
    ).count()

    total_direct = (
        db.query(models.DirectDonation)
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(models.BakeryInventory.bakery_id == user_id)
        .count()
    )

    total_donations = total_requests + total_direct

    # Mark badges as unlocked or not
    unlocked = []
    for badge in BADGES:
        unlocked.append({
            **badge,
            "unlocked": total_donations >= badge["goal"],
            "progress": min(total_donations, badge["goal"])
        })

    return {
        "user_id": user_id,
        "total_donations": total_donations,
        "badges": unlocked
    }