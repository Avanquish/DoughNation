from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, auth, database
from datetime import datetime

router = APIRouter()

# Count the total donation received but charity (specific charity not all)
@router.get("/charity/total_donations")
def get_charity_totals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role.lower() != "charity":
        return {"error": "Not authorized"}

    charity_id = current_user.id 

    # Count completed DonationRequests received by this charity
    normal_total = (
        db.query(func.count(models.DonationRequest.id))
        .filter(
            models.DonationRequest.charity_id == charity_id,
            models.DonationRequest.tracking_status == "complete"
        )
        .scalar()
    )

    # Count completed DirectDonations received by this charity
    direct_total = (
        db.query(func.count(models.DirectDonation.id))
        .filter(
            models.DirectDonation.charity_id == charity_id,
            models.DirectDonation.btracking_status == "complete"
        )
        .scalar()
    )

    grand_total = normal_total + direct_total

    return {
        "grand_total": grand_total,
        "normal_total": normal_total,
        "direct_total": direct_total,
    }

# Count the total donation send to charity either direct or normal (specific bakery not all)
@router.get("/bakery/total_donations_sent")
def get_bakery_totals(
    db: Session = Depends(get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Get bakery_id from either user or employee
    bakery_id = auth.get_bakery_id_from_auth(current_auth)

    # Count completed DonationRequests for this bakery via inventory
    normal_total = (
        db.query(func.count(models.DonationRequest.id))
        .join(models.BakeryInventory, models.DonationRequest.bakery_inventory_id == models.BakeryInventory.id)
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.DonationRequest.tracking_status == "complete"
        )
        .scalar()
    )

    # Count completed DirectDonations for this bakery via inventory
    direct_total = (
        db.query(func.count(models.DirectDonation.id))
        .join(models.BakeryInventory, models.DirectDonation.bakery_inventory_id == models.BakeryInventory.id)
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.DirectDonation.btracking_status == "complete"
        )
        .scalar()
    )

    grand_total = normal_total + direct_total

    return {
        "grand_total": grand_total,
        "normal_total": normal_total,
        "direct_total": direct_total,
    }

# Count the total product uploaded in for donation (bakery ui)
@router.get("/bakery/total_products_for_donation")
def get_total_products_for_donation(
    db: Session = Depends(get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Get bakery_id from either user or employee
    bakery_id = auth.get_bakery_id_from_auth(current_auth)

    # Count distinct products uploaded by this bakery
    total_products = (
        db.query(func.count(models.Donation.bakery_inventory_id.distinct()))
        .filter(models.Donation.bakery_id == bakery_id)
        .scalar()
    )

    return {"total_products": total_products}

@router.get("/analytics")
def get_bakery_analytics(
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    # Get bakery_id from either user or employee
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    # USE PHILIPPINE TIME (UTC+8)
    from datetime import timezone, timedelta
    philippine_tz = timezone(timedelta(hours=8))
    today = datetime.now(philippine_tz).date()

    # INVENTORY COUNTS
    total_inventory = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.bakery_id == bakery_id,
        models.BakeryInventory.status != "donated"
    ).all()

    fresh = 0
    soon = 0
    expired = 0

    for item in total_inventory:
        if not item.expiration_date:
            fresh += 1  #Items without expiration are fresh
            continue
        
        days_left = (item.expiration_date - today).days
        
        # Match frontend logic exactly
        if days_left < 0:
            expired += 1
        elif item.threshold == 0:
            # Special case: threshold 0 means check if expires today or tomorrow
            if days_left <= 1:
                soon += 1
            else:
                fresh += 1
        else:
            if days_left <= item.threshold:
                soon += 1
            else:
                fresh += 1

    # DONATION COUNTS
    uploaded_count = (
        db.query(func.count(models.Donation.id))
        .filter(models.Donation.bakery_id == bakery_id)
        .scalar()
    )

    completed_requests_count = (
        db.query(func.count(models.DonationRequest.id))
        .filter(
            models.DonationRequest.bakery_id == bakery_id,
            models.DonationRequest.tracking_status == "complete"
        )
        .scalar()
    )

    completed_direct_count = (
        db.query(func.count(models.DirectDonation.id))
        .join(models.BakeryInventory)
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.DirectDonation.btracking_status == "complete"
        )
        .scalar()
    )

    donated_count = completed_requests_count + completed_direct_count

    # Fetch all registered charities
    all_charities = db.query(models.User).filter(
        models.User.role == "Charity",
        models.User.verified == True
        
    ).all()

    # Maps for tracking totals
    charity_transaction_map = {}  # counts how many donations
    charity_given_map = {}        # sums total quantity

   
    #Requested donations (complete)
    charity_request_data = (
        db.query(
            models.DonationRequest.charity_id,
            func.count(models.DonationRequest.id).label("transaction_count"),
            func.coalesce(func.sum(models.DonationRequest.donation_quantity), 0).label("total_quantity")
        )
        .filter(
            models.DonationRequest.bakery_id == bakery_id,
            models.DonationRequest.tracking_status == "complete"
        )
        .group_by(models.DonationRequest.charity_id)
        .all()
    )

    for cid, count, qty in charity_request_data:
        charity_transaction_map[cid] = count
        charity_given_map[cid] = qty

   
    # Direct donations (complete)
    charity_direct_data = (
        db.query(
            models.DirectDonation.charity_id,
            func.count(models.DirectDonation.id).label("transaction_count"),
            func.coalesce(func.sum(models.DirectDonation.quantity), 0).label("total_quantity")
        )
        .join(models.BakeryInventory)
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.DirectDonation.btracking_status == "complete"
        )
        .group_by(models.DirectDonation.charity_id)
        .all()
    )

    for cid, count, qty in charity_direct_data:
        charity_transaction_map[cid] = charity_transaction_map.get(cid, 0) + count
        charity_given_map[cid] = charity_given_map.get(cid, 0) + qty

   
    # Build final output
    charity_donations_list = [
        {
            "name": c.name,
            "Total Donation Transaction": charity_transaction_map.get(c.id, 0),
            "Total Donation Given": charity_given_map.get(c.id, 0)
        }
        for c in all_charities
    ]

    # Debugging on terminal
    print(f"Analytics Debug → Uploaded: {uploaded_count}, Donated: {donated_count}")
    print(f"Inventory Debug → Fresh: {fresh}, Soon: {soon}, Expired: {expired}")
    print(f"Charities Debug → {charity_donations_list}")
    return {
        "inventory": {
            "fresh": fresh,
            "soon": soon,
            "expired": expired,
        },
        "donations": {
            "uploaded": uploaded_count,
            "donated": donated_count,
        },
        "charities": charity_donations_list,
    }
