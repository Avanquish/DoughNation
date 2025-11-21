from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, date
from app import database, models, auth

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

# Admin-only check
def check_admin(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@router.get("/manage_users")
def manage_users_report(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_admin),
    sort: str = "desc"
):
    # validate date range
    today = date.today()
    if end_date > today:
        raise HTTPException(status_code=400, detail="End date cannot be in the future")
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")

    order_by = models.User.created_at.asc() if sort == "asc" else desc(models.User.created_at)

    verified_users = (
        db.query(models.User)
        .filter(models.User.verified == True)
        .filter(models.User.role != "Admin")
        .filter(models.User.created_at >= start_date)
        .filter(models.User.created_at <= end_date)
        .order_by(order_by)
        .all()
    )

    result = []
    for u in verified_users:
        result.append({
            "role": u.role, 
            "name": u.name,
            "email": u.email,
            "contact_person": u.contact_person,
            "address": u.address,
            "profile_picture": u.profile_picture,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

     # admin details for report header
    admin_profile_picture = None
    if current_user.profile_picture:
        # If the path doesn't start with 'uploads/', add it
        if not current_user.profile_picture.startswith('uploads/'):
            admin_profile_picture = f"uploads/profile_pictures/{current_user.profile_picture}"
        else:
            admin_profile_picture = current_user.profile_picture
    
    admin_profile = {
        "profile_picture": admin_profile_picture 
    }

    return {
        "users": result, 
        "start_date": start_date.isoformat(), 
        "end_date": end_date.isoformat(),
        "admin_profile": admin_profile
    } 


@router.get("/donation_list")
def donation_list_report(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_admin),
):
    # Validate date range
    today = date.today()
    if end_date > today:
        raise HTTPException(status_code=400, detail="End date cannot be in the future")
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")

    # Query ONLY COMPLETED donation requests (tracking_status = "complete")
    donation_requests = (
        db.query(models.DonationRequest)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.tracking_completed_at >= start_date)
        .filter(models.DonationRequest.tracking_completed_at <= end_date)
        .order_by(desc(models.DonationRequest.tracking_completed_at))
        .all()
    )

    # Query ONLY COMPLETED direct donations (btracking_status = "complete")
    direct_donations = (
        db.query(models.DirectDonation)
        .filter(models.DirectDonation.btracking_status == "complete")
        .filter(models.DirectDonation.btracking_completed_at >= start_date)
        .filter(models.DirectDonation.btracking_completed_at <= end_date)
        .order_by(desc(models.DirectDonation.btracking_completed_at))
        .all()
    )

    # Process donation requests
    request_data = []
    request_total_quantity = 0

    for req in donation_requests:
        # Get donor (bakery) name
        donor_name = req.bakery.name if req.bakery else "Unknown"
        
        # Get receiver (charity) name
        receiver_name = req.charity.name if req.charity else "Unknown"
        
        quantity = req.donation_quantity or 0
        request_total_quantity += quantity

        request_data.append({
            "id": req.id,
            "type": "Request",
            "donation_name": req.donation_name or "N/A",
            "donor_name": donor_name,
            "receiver_name": receiver_name,
            "quantity": quantity,
            "status": req.status,
            "tracking_status": req.tracking_status,
            "is_completed": True,  # Always true since we're filtering completed
            "completed_at": req.tracking_completed_at.isoformat() if req.tracking_completed_at else None,
            "timestamp": req.tracking_completed_at.isoformat() if req.tracking_completed_at else None,
            "expiration_date": req.donation_expiration.isoformat() if req.donation_expiration else None,
        })

    # Process direct donations
    direct_data = []
    direct_total_quantity = 0

    for dd in direct_donations:
        # Get donor (bakery) name from inventory relationship
        donor_name = "Unknown"
        if dd.bakery_inventory and dd.bakery_inventory.bakery:
            donor_name = dd.bakery_inventory.bakery.name
        elif dd.donated_by:
            donor_name = dd.donated_by

        # Get receiver (charity) name
        receiver_name = dd.charity.name if dd.charity else "Unknown"
        
        quantity = dd.quantity or 0
        direct_total_quantity += quantity

        direct_data.append({
            "id": dd.id,
            "type": "Direct",
            "donation_name": dd.name,
            "donor_name": donor_name,
            "receiver_name": receiver_name,
            "quantity": quantity,
            "tracking_status": dd.btracking_status,
            "is_completed": True,  # Always true since we're filtering completed
            "completed_at": dd.btracking_completed_at.isoformat() if dd.btracking_completed_at else None,
            "timestamp": dd.btracking_completed_at.isoformat() if dd.btracking_completed_at else None,
            "expiration_date": dd.expiration_date.isoformat() if dd.expiration_date else None,
        })

    # Combine all completed donations
    all_donations = request_data + direct_data
    
    # Sort by completed date (newest first)
    all_donations.sort(key=lambda x: x["completed_at"] or "", reverse=True)

    # Calculate summary statistics (all are completed)
    summary = {
        "total_donations": len(all_donations),
        "total_quantity": request_total_quantity + direct_total_quantity,
        "request_count": len(request_data),
        "direct_count": len(direct_data),
        "completed_count": len(all_donations),  # All are completed
        "request_quantity": request_total_quantity,
        "direct_quantity": direct_total_quantity,
        "request_completed": len(request_data),  # All requests are completed
        "direct_completed": len(direct_data),  # All direct are completed
    }

    # Admin profile for report header
    admin_profile_picture = None
    if current_user.profile_picture:
        if not current_user.profile_picture.startswith('uploads/'):
            admin_profile_picture = f"uploads/profile_pictures/{current_user.profile_picture}"
        else:
            admin_profile_picture = current_user.profile_picture
    
    admin_profile = {
        "profile_picture": admin_profile_picture 
    }

    return {
        "donations": all_donations,
        "summary": summary,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "admin_profile": admin_profile
    }
