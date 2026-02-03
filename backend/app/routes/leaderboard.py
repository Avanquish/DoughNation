from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from typing import List, Optional
from datetime import datetime, date

from app.database import get_db
from app.models import User, Donation, DonationRequest, DirectDonation, BakeryInventory, AdminDonationRequest
from app.auth import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


def get_current_admin(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Verify that the current user is an admin.
    """
    # current_user is already a User object from get_current_user
    if not current_user or current_user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    return current_user


@router.get("/summary")
def get_leaderboard_summary(
    limit: Optional[int] = 10,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get aggregated donation data for bakeries leaderboard.
    Only accessible by admin users.
    Only includes verified bakeries.
    
    Returns:
    - bakery_name: Name of the bakery
    - total_donations: Count of all donations made
    - total_quantity: Sum of all donated items
    - latest_donation_date: Date of most recent donation
    - rank: Position in leaderboard based on total quantity
    """
    
    # Get all verified donors (bakeries) only
    bakeries = db.query(User).filter(
        User.role.ilike("Donor"),
        User.verified == True
    ).all()
    
    leaderboard_data = []
    
    for bakery in bakeries:
        # Count completed donation requests (to charities)
        request_donations = db.query(
            func.count(DonationRequest.id).label('count'),
            func.sum(DonationRequest.donation_quantity).label('quantity'),
            func.max(DonationRequest.timestamp).label('latest_date')
        ).filter(
            DonationRequest.bakery_id == bakery.id,
            DonationRequest.tracking_status.ilike('complete')
        ).first()
        
        # Count completed direct donations (to charities)
        direct_donations = db.query(
            func.count(DirectDonation.id).label('count'),
            func.sum(DirectDonation.quantity).label('quantity'),
            func.max(DirectDonation.creation_date).label('latest_date')
        ).join(
            BakeryInventory,
            DirectDonation.bakery_inventory_id == BakeryInventory.id
        ).filter(
            BakeryInventory.bakery_id == bakery.id,
            DirectDonation.btracking_status.ilike('complete')
        ).first()
        
        # Count completed donations to admin
        admin_donations = db.query(
            func.count(AdminDonationRequest.id).label('count'),
            func.sum(AdminDonationRequest.donation_quantity).label('quantity'),
            func.max(AdminDonationRequest.timestamp).label('latest_date')
        ).filter(
            AdminDonationRequest.donor_id == bakery.id,
            AdminDonationRequest.tracking_status.ilike('complete')
        ).first()
        
        # Aggregate totals
        total_donations = (request_donations.count or 0) + (direct_donations.count or 0) + (admin_donations.count or 0)
        total_quantity = (request_donations.quantity or 0) + (direct_donations.quantity or 0) + (admin_donations.quantity or 0)
        
        # Get latest donation date
        dates = []
        if request_donations.latest_date:
            if isinstance(request_donations.latest_date, datetime):
                dates.append(request_donations.latest_date.date())
            elif isinstance(request_donations.latest_date, date):
                dates.append(request_donations.latest_date)
                
        if direct_donations.latest_date:
            if isinstance(direct_donations.latest_date, datetime):
                dates.append(direct_donations.latest_date.date())
            elif isinstance(direct_donations.latest_date, date):
                dates.append(direct_donations.latest_date)
        
        if admin_donations.latest_date:
            if isinstance(admin_donations.latest_date, datetime):
                dates.append(admin_donations.latest_date.date())
            elif isinstance(admin_donations.latest_date, date):
                dates.append(admin_donations.latest_date)
        
        latest_donation_date = max(dates) if dates else None
        
        leaderboard_data.append({
            "bakery_id": bakery.id,
            "bakery_name": bakery.name,
            "total_donations": total_donations,
            "total_quantity": int(total_quantity) if total_quantity else 0,
            "latest_donation_date": latest_donation_date.isoformat() if latest_donation_date else None,
            "profile_picture": bakery.profile_picture,
            "verified": bakery.verified
        })
    
    # Sort by total_quantity (descending) and assign ranks
    leaderboard_data.sort(key=lambda x: x['total_quantity'], reverse=True)
    
    for idx, entry in enumerate(leaderboard_data, start=1):
        entry['rank'] = idx
    
    # Apply limit if specified
    if limit:
        leaderboard_data = leaderboard_data[:limit]
    
    return leaderboard_data


@router.get("/charities")
def get_charity_leaderboard(
    limit: Optional[int] = 10,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get aggregated donation data for charities (receiving side).
    Only accessible by admin users.
    Only includes verified charities.
    
    Returns:
    - charity_name: Name of the charity
    - total_received: Count of donations received
    - total_quantity_received: Sum of all received items
    - latest_received_date: Date of most recent received donation
    - rank: Position in leaderboard based on total quantity received
    """
    
    # Get all verified charities only
    charities = db.query(User).filter(
        User.role.ilike("Charity"),
        User.verified == True
    ).all()
    
    charity_data = []
    
    for charity in charities:
        # Count completed donation requests received
        request_received = db.query(
            func.count(DonationRequest.id).label('count'),
            func.sum(DonationRequest.donation_quantity).label('quantity'),
            func.max(DonationRequest.timestamp).label('latest_date')
        ).filter(
            DonationRequest.charity_id == charity.id,
            DonationRequest.tracking_status.ilike('complete')
        ).first()
        
        # Count completed direct donations received
        direct_received = db.query(
            func.count(DirectDonation.id).label('count'),
            func.sum(DirectDonation.quantity).label('quantity'),
            func.max(DirectDonation.creation_date).label('latest_date')
        ).filter(
            DirectDonation.charity_id == charity.id,
            DirectDonation.btracking_status.ilike('complete')
        ).first()
        
        # Aggregate totals
        total_received = (request_received.count or 0) + (direct_received.count or 0)
        total_quantity_received = (request_received.quantity or 0) + (direct_received.quantity or 0)
        
        # Get latest received date
        dates = []
        if request_received.latest_date:
            if isinstance(request_received.latest_date, datetime):
                dates.append(request_received.latest_date.date())
            elif isinstance(request_received.latest_date, date):
                dates.append(request_received.latest_date)
                
        if direct_received.latest_date:
            if isinstance(direct_received.latest_date, datetime):
                dates.append(direct_received.latest_date.date())
            elif isinstance(direct_received.latest_date, date):
                dates.append(direct_received.latest_date)
        
        latest_received_date = max(dates) if dates else None
        
        charity_data.append({
            "charity_id": charity.id,
            "charity_name": charity.name,
            "total_received": total_received,
            "total_quantity_received": int(total_quantity_received) if total_quantity_received else 0,
            "latest_received_date": latest_received_date.isoformat() if latest_received_date else None,
            "profile_picture": charity.profile_picture,
            "verified": charity.verified
        })
    
    # Sort by total_quantity_received (descending) and assign ranks
    charity_data.sort(key=lambda x: x['total_quantity_received'], reverse=True)
    
    for idx, entry in enumerate(charity_data, start=1):
        entry['rank'] = idx
    
    # Apply limit if specified
    if limit:
        charity_data = charity_data[:limit]
    
    return charity_data


@router.get("/top-performers")
def get_top_performers(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get top 3 verified bakeries and top 3 verified charities for quick dashboard overview.
    Only accessible by admin users.
    """
    
    # Get top 3 bakeries
    bakeries_leaderboard = get_leaderboard_summary(limit=3, current_user=current_user, db=db)
    
    # Get top 3 charities
    charities_leaderboard = get_charity_leaderboard(limit=3, current_user=current_user, db=db)
    
    return {
        "top_bakeries": bakeries_leaderboard,
        "top_charities": charities_leaderboard
    }


@router.get("/stats")
def get_leaderboard_stats(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get overall leaderboard statistics.
    Only accessible by admin users.
    Only counts verified users.
    
    Returns:
    - total_bakeries: Total number of verified bakeries
    - active_bakeries: Verified bakeries with at least 1 completed donation
    - total_charities: Total number of verified charities
    - active_charities: Verified charities with at least 1 received donation
    - total_donations_completed: Overall completed donations
    - total_items_donated: Overall donated items
    """
    
    # Count verified donors (bakeries) only
    total_bakeries = db.query(User).filter(
        User.role.ilike("Donor"),
        User.verified == True
    ).count()
    
    # Get verified donor (bakery) IDs
    verified_bakery_ids = [b.id for b in db.query(User.id).filter(
        User.role.ilike("Donor"),
        User.verified == True
    ).all()]
    
    # Count active verified bakeries (with at least 1 completed donation)
    active_bakeries_request = db.query(DonationRequest.bakery_id).filter(
        DonationRequest.tracking_status.ilike('complete'),
        DonationRequest.bakery_id.in_(verified_bakery_ids)
    ).distinct().all()
    
    active_bakeries_direct = db.query(BakeryInventory.bakery_id).join(
        DirectDonation,
        DirectDonation.bakery_inventory_id == BakeryInventory.id
    ).filter(
        DirectDonation.btracking_status.ilike('complete'),
        BakeryInventory.bakery_id.in_(verified_bakery_ids)
    ).distinct().all()
    
    active_bakeries_admin = db.query(AdminDonationRequest.donor_id).filter(
        AdminDonationRequest.tracking_status.ilike('complete'),
        AdminDonationRequest.donor_id.in_(verified_bakery_ids)
    ).distinct().all()
    
    active_bakery_ids = set([b[0] for b in active_bakeries_request] + [b[0] for b in active_bakeries_direct] + [b[0] for b in active_bakeries_admin])
    active_bakeries = len(active_bakery_ids)
    
    # Count verified charities only
    total_charities = db.query(User).filter(
        User.role.ilike("Charity"),
        User.verified == True
    ).count()
    
    # Get verified charity IDs
    verified_charity_ids = [c.id for c in db.query(User.id).filter(
        User.role.ilike("Charity"),
        User.verified == True
    ).all()]
    
    # Count active verified charities
    active_charities_request = db.query(DonationRequest.charity_id).filter(
        DonationRequest.tracking_status.ilike('complete'),
        DonationRequest.charity_id.in_(verified_charity_ids)
    ).distinct().all()
    
    active_charities_direct = db.query(DirectDonation.charity_id).filter(
        DirectDonation.btracking_status.ilike('complete'),
        DirectDonation.charity_id.in_(verified_charity_ids)
    ).distinct().all()
    
    active_charity_ids = set([c[0] for c in active_charities_request] + [c[0] for c in active_charities_direct])
    active_charities = len(active_charity_ids)
    
    # Count total completed donations (from verified users only)
    completed_requests = db.query(DonationRequest).filter(
        DonationRequest.tracking_status.ilike('complete'),
        DonationRequest.bakery_id.in_(verified_bakery_ids),
        DonationRequest.charity_id.in_(verified_charity_ids)
    ).count()
    
    completed_direct = db.query(DirectDonation).join(
        BakeryInventory,
        DirectDonation.bakery_inventory_id == BakeryInventory.id
    ).filter(
        DirectDonation.btracking_status.ilike('complete'),
        BakeryInventory.bakery_id.in_(verified_bakery_ids),
        DirectDonation.charity_id.in_(verified_charity_ids)
    ).count()
    
    # Count completed admin donations
    completed_admin = db.query(AdminDonationRequest).filter(
        AdminDonationRequest.tracking_status.ilike('complete'),
        AdminDonationRequest.donor_id.in_(verified_bakery_ids)
    ).count()
    
    total_donations_completed = completed_requests + completed_direct + completed_admin
    
    # Sum total items donated (from verified users only)
    total_request_quantity = db.query(
        func.sum(DonationRequest.donation_quantity)
    ).filter(
        DonationRequest.tracking_status.ilike('complete'),
        DonationRequest.bakery_id.in_(verified_bakery_ids),
        DonationRequest.charity_id.in_(verified_charity_ids)
    ).scalar() or 0
    
    total_direct_quantity = db.query(
        func.sum(DirectDonation.quantity)
    ).join(
        BakeryInventory,
        DirectDonation.bakery_inventory_id == BakeryInventory.id
    ).filter(
        DirectDonation.btracking_status.ilike('complete'),
        BakeryInventory.bakery_id.in_(verified_bakery_ids),
        DirectDonation.charity_id.in_(verified_charity_ids)
    ).scalar() or 0
    
    total_admin_quantity = db.query(
        func.sum(AdminDonationRequest.donation_quantity)
    ).filter(
        AdminDonationRequest.tracking_status.ilike('complete'),
        AdminDonationRequest.donor_id.in_(verified_bakery_ids)
    ).scalar() or 0
    
    total_items_donated = int(total_request_quantity) + int(total_direct_quantity) + int(total_admin_quantity)
    
    return {
        "total_bakeries": total_bakeries,
        "active_bakeries": active_bakeries,
        "total_charities": total_charities,
        "active_charities": active_charities,
        "total_donations_completed": total_donations_completed,
        "total_items_donated": total_items_donated
    }