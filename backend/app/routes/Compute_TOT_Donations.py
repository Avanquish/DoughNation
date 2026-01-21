from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, auth, database
from datetime import datetime
from app.timezone_utils import today_ph

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
    today = today_ph()

    # OPTIMIZED INVENTORY COUNTS - Use database aggregation instead of fetching all records
    # Count fresh: no expiration OR (expiration > today + threshold)
    # Count soon: expiration <= today + threshold AND expiration >= today
    # Count expired: expiration < today
    
    # Query only necessary fields and do calculations in database
    inventory_items = db.query(
        models.BakeryInventory.expiration_date,
        models.BakeryInventory.threshold
    ).filter(
        models.BakeryInventory.bakery_id == bakery_id,
        models.BakeryInventory.status != "donated"
    ).all()

    fresh = 0
    soon = 0
    expired = 0

    for exp_date, threshold in inventory_items:
        if not exp_date:
            fresh += 1
            continue
        
        days_left = (exp_date - today).days
        
        if days_left < 0:
            expired += 1
        elif threshold == 0:
            if days_left <= 1:
                soon += 1
            else:
                fresh += 1
        else:
            if days_left <= threshold:
                soon += 1
            else:
                fresh += 1

    # DONATION COUNTS - All optimized with single queries
    uploaded_count = (
        db.query(func.count(models.Donation.id))
        .filter(models.Donation.bakery_id == bakery_id)
        .scalar() or 0
    )

    completed_requests_count = (
        db.query(func.count(models.DonationRequest.id))
        .filter(
            models.DonationRequest.bakery_id == bakery_id,
            models.DonationRequest.tracking_status == "complete"
        )
        .scalar() or 0
    )

    completed_direct_count = (
        db.query(func.count(models.DirectDonation.id))
        .join(models.BakeryInventory)
        .filter(
            models.BakeryInventory.bakery_id == bakery_id,
            models.DirectDonation.btracking_status == "complete"
        )
        .scalar() or 0
    )

    donated_count = completed_requests_count + completed_direct_count

    # OPTIMIZED: Fetch only charities that have donations from this bakery
    # Instead of fetching ALL charities and then checking if they have donations
    
    # Get charity IDs with donations
    charity_ids_with_donations = set()
    
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

    charity_transaction_map = {}
    charity_given_map = {}
    
    for cid, count, qty in charity_request_data:
        charity_transaction_map[cid] = count
        charity_given_map[cid] = qty
        charity_ids_with_donations.add(cid)

   
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
        charity_ids_with_donations.add(cid)

    # Admin donations (donations to NGO)
    admin_donation_data = (
        db.query(
            func.count(models.AdminDonationRequest.id).label("transaction_count"),
            func.coalesce(func.sum(models.AdminDonationRequest.donation_quantity), 0).label("total_quantity")
        )
        .filter(
            models.AdminDonationRequest.donor_id == bakery_id,
            models.AdminDonationRequest.tracking_status == "complete"
        )
        .first()
    )

    admin_transaction_count = admin_donation_data[0] if admin_donation_data else 0
    admin_total_quantity = admin_donation_data[1] if admin_donation_data else 0
   
    # OPTIMIZED: Only fetch charities that have donations
    charity_donations_list = []
    
    if charity_ids_with_donations:
        charities_with_donations = db.query(
            models.User.id,
            models.User.name
        ).filter(
            models.User.id.in_(charity_ids_with_donations),
            models.User.role == "Charity"
        ).all()
        
        charity_donations_list = [
            {
                "name": c.name,
                "Total Donation Transaction": charity_transaction_map.get(c.id, 0),
                "Total Donation Given": charity_given_map.get(c.id, 0)
            }
            for c in charities_with_donations
        ]

    # Add NGO/Admin donations to the list
    if admin_transaction_count > 0 or admin_total_quantity > 0:
        charity_donations_list.append({
            "name": "Scholars Of Sustenance (NGO)",
            "Total Donation Transaction": admin_transaction_count,
            "Total Donation Given": admin_total_quantity
        })

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