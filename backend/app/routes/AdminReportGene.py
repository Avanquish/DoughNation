from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, date
from app import database, models, auth
from app.timezone_utils import today_ph, get_day_start_ph, get_day_end_ph, to_ph_timezone

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

# Helper function to safely convert date/datetime to Philippine timezone ISO format
def to_ph_iso(dt):
    """Convert date or datetime to Philippine timezone ISO format string."""
    if dt is None:
        return None
    
    from zoneinfo import ZoneInfo
    PHILIPPINES_TZ = ZoneInfo("Asia/Manila")
    
    # If it's a date object, convert to datetime at midnight Philippine time
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())
        dt = dt.replace(tzinfo=PHILIPPINES_TZ)
        return dt.isoformat()
    
    # If it's a datetime object
    if isinstance(dt, datetime):
        # If datetime is naive (no timezone), assume it's already in Philippine timezone
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=PHILIPPINES_TZ)
        else:
            # If it has timezone info, convert to Philippine timezone
            dt = dt.astimezone(PHILIPPINES_TZ)
        return dt.isoformat()
    
    return None

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
    today = today_ph()
    if end_date > today:
        raise HTTPException(status_code=400, detail="End date cannot be in the future")
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")

    order_by = models.User.created_at.asc() if sort == "asc" else desc(models.User.created_at)

    # Convert dates to Philippine timezone datetime ranges for proper comparison
    start_datetime = get_day_start_ph(start_date)
    end_datetime = get_day_end_ph(end_date)

    verified_users = (
        db.query(models.User)
        .filter(models.User.verified == True)
        .filter(models.User.role != "Admin")
        .filter(models.User.created_at >= start_datetime)
        .filter(models.User.created_at <= end_datetime)
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
            "created_at": to_ph_iso(u.created_at),
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
    donor_filter: str | None = Query(None, description="Filter by donor name (optional)"),
    receiver_filter: str | None = Query(None, description="Filter by receiver name (optional)"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_admin),
):
    # Validate date range
    today = today_ph()
    if end_date > today:
        raise HTTPException(status_code=400, detail="End date cannot be in the future")
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")

    # Convert dates to datetime ranges in Philippine timezone
    start_datetime = get_day_start_ph(start_date)
    end_datetime = get_day_end_ph(end_date)

    # Query ONLY COMPLETED donation requests (tracking_status = "complete")
    donation_requests = (
        db.query(models.DonationRequest)
        .filter(models.DonationRequest.tracking_status == "complete")
        .filter(models.DonationRequest.tracking_completed_at >= start_datetime)
        .filter(models.DonationRequest.tracking_completed_at <= end_datetime)
        .order_by(desc(models.DonationRequest.tracking_completed_at))
        .all()
    )

    # Query ONLY COMPLETED direct donations (btracking_status = "complete")
    direct_donations = (
        db.query(models.DirectDonation)
        .filter(models.DirectDonation.btracking_status == "complete")
        .filter(models.DirectDonation.btracking_completed_at >= start_datetime)
        .filter(models.DirectDonation.btracking_completed_at <= end_datetime)
        .order_by(desc(models.DirectDonation.btracking_completed_at))
        .all()
    )

    # Query ONLY COMPLETED admin donations (tracking_status = "complete")
    admin_donations = (
        db.query(models.AdminDonationRequest)
        .filter(models.AdminDonationRequest.tracking_status == "complete")
        .filter(models.AdminDonationRequest.tracking_completed_at >= start_datetime)
        .filter(models.AdminDonationRequest.tracking_completed_at <= end_datetime)
        .order_by(desc(models.AdminDonationRequest.tracking_completed_at))
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
        
        # Apply filters if provided
        if donor_filter and donor_name.lower() != donor_filter.lower():
            continue
        if receiver_filter and receiver_name.lower() != receiver_filter.lower():
            continue
        
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
            "completed_at": to_ph_iso(req.tracking_completed_at),
            "timestamp": to_ph_iso(req.tracking_completed_at),
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
            # Replace Super Admin with Scholars Of Sustenance
            donor_name = "Scholars Of Sustenance" if dd.donated_by.lower() in ["super admin", "admin"] else dd.donated_by

        # Get receiver (charity) name or check if it's admin
        if dd.charity:
            receiver_name = dd.charity.name
        else:
            # If no charity, it's a donation to admin
            receiver_name = "Scholars Of Sustenance"
        
        # Apply filters if provided
        if donor_filter and donor_name.lower() != donor_filter.lower():
            continue
        if receiver_filter and receiver_name.lower() != receiver_filter.lower():
            continue
        
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
            "completed_at": to_ph_iso(dd.btracking_completed_at),
            "timestamp": to_ph_iso(dd.btracking_completed_at),
            "expiration_date": dd.expiration_date.isoformat() if dd.expiration_date else None,
        })

    # Process admin donations (bakery to admin)
    admin_data = []
    admin_total_quantity = 0

    for ad in admin_donations:
        # Get donor name from the donor user
        donor = db.query(models.User).filter(models.User.id == ad.donor_id).first()
        donor_name = donor.name if donor else ad.donor_name or "Unknown"
        
        # Receiver is always admin
        receiver_name = "Scholars Of Sustenance"
        
        # Apply filters if provided
        if donor_filter and donor_name.lower() != donor_filter.lower():
            continue
        if receiver_filter and receiver_name.lower() != receiver_filter.lower():
            continue
        
        quantity = ad.donation_quantity or 0
        admin_total_quantity += quantity

        admin_data.append({
            "id": ad.id,
            "type": "Admin",
            "donation_name": ad.donation_name,
            "donor_name": donor_name,
            "receiver_name": receiver_name,
            "quantity": quantity,
            "tracking_status": ad.tracking_status,
            "is_completed": True,  # Always true since we're filtering completed
            "completed_at": to_ph_iso(ad.tracking_completed_at),
            "timestamp": to_ph_iso(ad.tracking_completed_at),
            "expiration_date": ad.donation_expiration.isoformat() if ad.donation_expiration else None,
        })

    # Combine all completed donations
    all_donations = request_data + direct_data + admin_data
    
    # Sort by completed date (newest first)
    all_donations.sort(key=lambda x: x["completed_at"] or "", reverse=True)

    # Calculate summary statistics (all are completed)
    summary = {
        "total_donations": len(all_donations),
        "total_quantity": request_total_quantity + direct_total_quantity + admin_total_quantity,
        "request_count": len(request_data),
        "direct_count": len(direct_data),
        "admin_count": len(admin_data),
        "completed_count": len(all_donations),  # All are completed
        "request_quantity": request_total_quantity,
        "direct_quantity": direct_total_quantity,
        "admin_quantity": admin_total_quantity,
        "request_completed": len(request_data),  # All requests are completed
        "direct_completed": len(direct_data),  # All direct are completed
        "admin_completed": len(admin_data),  # All admin are completed
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


@router.get("/donation_filters")
def get_donation_filters(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(check_admin)
):
    """Get unique donor and recipient names for filtering donation list."""
    
    try:
        # Convert dates to datetime ranges in Philippine timezone (same as donation_list)
        start_datetime = get_day_start_ph(start_date)
        end_datetime = get_day_end_ph(end_date)
        
        donors = set()
        recipients = set()
        
        # Get donors and recipients from DonationRequest (Request donations)
        # Use same query logic as donation_list endpoint
        request_donations = db.query(models.DonationRequest).filter(
            models.DonationRequest.tracking_status == "complete",
            models.DonationRequest.tracking_completed_at >= start_datetime,
            models.DonationRequest.tracking_completed_at <= end_datetime
        ).all()
        
        print(f"Found {len(request_donations)} completed request donations")
        
        for d in request_donations:
            try:
                if d.bakery and d.bakery.name:
                    donors.add(d.bakery.name)
                    print(f"Added donor from request: {d.bakery.name}")
                if d.charity and d.charity.name:
                    recipients.add(d.charity.name)
                    print(f"Added recipient from request: {d.charity.name}")
            except Exception as e:
                print(f"Error processing request donation: {e}")
                continue
        
        # Get donors and recipients from DirectDonation (Direct donations)
        # Use same query logic as donation_list endpoint
        direct_donations = db.query(models.DirectDonation).filter(
            models.DirectDonation.btracking_status == "complete",
            models.DirectDonation.btracking_completed_at >= start_datetime,
            models.DirectDonation.btracking_completed_at <= end_datetime
        ).all()
        
        print(f"Found {len(direct_donations)} completed direct donations")
        
        for d in direct_donations:
            try:
                # Get donor name using same logic as donation_list
                donor_name = None
                if d.bakery_inventory and d.bakery_inventory.bakery and d.bakery_inventory.bakery.name:
                    donor_name = d.bakery_inventory.bakery.name
                elif d.donated_by:
                    # Replace Super Admin with Scholars Of Sustenance
                    donor_name = "Scholars Of Sustenance" if d.donated_by.lower() in ["super admin", "admin"] else d.donated_by
                
                if donor_name:
                    donors.add(donor_name)
                    print(f"Added donor from direct: {donor_name}")
                
                # Get recipient name - use same logic as donation_list
                if d.charity and d.charity.name:
                    recipients.add(d.charity.name)
                    print(f"Added recipient from direct: {d.charity.name}")
                else:
                    # If no charity, it's a donation to admin (same as donation_list logic)
                    recipients.add("Scholars Of Sustenance")
                    print(f"Added recipient: Scholars Of Sustenance (no charity, donation to admin)")
            except Exception as e:
                print(f"Error processing direct donation: {e}")
                continue
        
        # Get donors from AdminDonationRequest (bakery to admin donations)
        # Use same query logic as donation_list endpoint
        admin_donations = db.query(models.AdminDonationRequest).filter(
            models.AdminDonationRequest.tracking_status == "complete",
            models.AdminDonationRequest.tracking_completed_at >= start_datetime,
            models.AdminDonationRequest.tracking_completed_at <= end_datetime
        ).all()
        
        print(f"Found {len(admin_donations)} completed admin donations")
        
        for d in admin_donations:
            try:
                if d.bakery and d.bakery.name:
                    donors.add(d.bakery.name)
                    print(f"Added donor from admin donation: {d.bakery.name}")
                recipients.add("Scholars Of Sustenance")
                print(f"Added recipient: Scholars Of Sustenance (admin)")
            except Exception as e:
                print(f"Error processing admin donation: {e}")
                continue
        
        # Verification: Check if we have any donations where admin is recipient
        # by checking if there are admin_donations or direct donations without charity
        if len(admin_donations) > 0:
            recipients.add("Scholars Of Sustenance")
            print("Ensuring 'Scholars Of Sustenance' in recipients (admin donations exist)")
        
        direct_to_admin = [d for d in direct_donations if not d.charity]
        if len(direct_to_admin) > 0:
            recipients.add("Scholars Of Sustenance")
            print(f"Ensuring 'Scholars Of Sustenance' in recipients ({len(direct_to_admin)} direct donations to admin)")
        
        donor_list = sorted(list(donors))
        recipient_list = sorted(list(recipients))
        
        print(f"Final donors: {donor_list}")
        print(f"Final recipients: {recipient_list}")
        
        return {
            "donors": donor_list,
            "recipients": recipient_list
        }
    except Exception as e:
        print(f"Error in donation_filters endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching filter options: {str(e)}")