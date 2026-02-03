"""
Admin donation routes - handles donations from donors to admin (Scholars Of Sustenance)
and managing received inventory
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
import shutil
import os

from app import models, database, auth
from app import admin_models
from app.product_id_generator import generate_product_id, generate_admin_product_id
from app.timezone_utils import now_ph
from app.food_safety import calculate_donation_deadline

router = APIRouter(prefix="/admin", tags=["Admin Donations"])


class CreateAdminDonationRequest(BaseModel):
    """Request to create donation from donor to admin"""
    inventory_item_id: int
    quantity: int
    food_category: str = "other"


class UpdateTrackingStatusRequest(BaseModel):
    """Update tracking status of admin donation"""
    tracking_status: str  # preparing, in_transit, received, complete


class CreateCharityDonationRequest(BaseModel):
    """Request to create donation from admin to charity"""
    inventory_item_id: int
    charity_id: int
    quantity: int


@router.post("/donate-to-admin")
def create_admin_donation(
    request: CreateAdminDonationRequest,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Create a donation from donor to admin (Scholars Of Sustenance).
    This is triggered when donor clicks "Donate" on threshold modal.
    """
    if current_user.role != "Donor":
        raise HTTPException(status_code=403, detail="Only donors can create donations")
    
    # Get inventory item
    inventory_item = db.query(models.DonorInventory).filter(
        models.DonorInventory.id == request.inventory_item_id,
        models.DonorInventory.bakery_id == current_user.id
    ).first()
    
    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    if inventory_item.quantity < request.quantity:
        raise HTTPException(status_code=400, detail="Insufficient quantity in inventory")
    
    # Get admin user (Scholars Of Sustenance)
    admin_user = db.query(models.User).filter(
        models.User.role == "Admin"
    ).first()
    
    if not admin_user:
        raise HTTPException(status_code=500, detail="Admin user not found")
    
    # Calculate donation deadline using food safety grace period
    donation_deadline = None
    if inventory_item.expiration_date and inventory_item.donation_type == "Food":
        donation_deadline = calculate_donation_deadline(
            inventory_item.expiration_date,
            request.food_category
        )
    
    # Create admin donation request
    donation_request = models.AdminDonationRequest(
        bakery_inventory_id=inventory_item.id,
        donor_id=current_user.id,
        admin_id=admin_user.id,
        donation_name=inventory_item.name,
        donation_image=inventory_item.image,
        donation_quantity=request.quantity,
        donation_expiration=inventory_item.expiration_date,
        donation_type=inventory_item.donation_type,
        food_category=request.food_category,
        donation_deadline=donation_deadline,
        status="accepted",  # Auto-accept donations to admin
        tracking_status="preparing",
        donor_name=current_user.name,
        donor_profile_picture=current_user.profile_picture
    )
    
    db.add(donation_request)
    
    # Update inventory quantity
    inventory_item.quantity -= request.quantity
    
    # If quantity reaches 0, mark as unavailable
    if inventory_item.quantity <= 0:
        inventory_item.status = "donated"
    
    db.commit()
    db.refresh(donation_request)
    
    # Create notification for admin about the new donation
    notification_title = f"New Donation from {current_user.name}"
    notification_message = f"{current_user.name} has donated {request.quantity} {inventory_item.name} to Scholars Of Sustenance. Tracking Status: Preparing"
    
    notification = admin_models.SystemNotification(
        title=notification_title,
        message=notification_message,
        notification_type="donation_received",
        target_user_id=admin_user.id,
        sent_by_admin_id=admin_user.id,
        send_email=False,
        send_in_app=True,
        sent_at=now_ph(),
        notification_data={
            "donation_id": donation_request.id,
            "donor_id": current_user.id,
            "donor_name": current_user.name,
            "donation_name": inventory_item.name,
            "quantity": request.quantity,
            "tracking_status": "preparing"
        }
    )
    db.add(notification)
    db.flush()
    
    # Create notification receipt
    receipt = admin_models.NotificationReceipt(
        notification_id=notification.id,
        user_id=admin_user.id,
        is_read=False
    )
    db.add(receipt)
    db.commit()
    
    return {
        "message": "Donation created successfully",
        "donation_id": donation_request.id,
        "tracking_status": donation_request.tracking_status
    }


@router.post("/admin-donations")
async def create_direct_admin_donation(
    inventory_item_id: int = Form(...),
    donation_quantity: int = Form(...),
    food_category: str = Form("other"),
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Create a donation from donor to admin (Scholars Of Sustenance) from inventory item.
    This is used when donating to admin from the donation form.
    """
    if current_user.role != "Donor":
        raise HTTPException(status_code=403, detail="Only donors can create donations")
    
    # Get inventory item
    inventory_item = db.query(models.DonorInventory).filter(
        models.DonorInventory.id == inventory_item_id,
        models.DonorInventory.bakery_id == current_user.id
    ).first()
    
    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    if inventory_item.quantity < donation_quantity:
        raise HTTPException(status_code=400, detail="Insufficient quantity in inventory")
    
    # Get admin user (Scholars Of Sustenance)
    admin_user = db.query(models.User).filter(
        models.User.role == "Admin"
    ).first()
    
    if not admin_user:
        raise HTTPException(status_code=500, detail="Admin user not found")
    
    # Calculate donation deadline using food safety grace period
    donation_deadline = None
    if inventory_item.expiration_date and inventory_item.donation_type == "Food":
        donation_deadline = calculate_donation_deadline(
            inventory_item.expiration_date,
            food_category
        )
    
    # Create admin donation request
    donation_request = models.AdminDonationRequest(
        bakery_inventory_id=inventory_item_id,
        donor_id=current_user.id,
        admin_id=admin_user.id,
        donation_name=inventory_item.name,
        donation_image=inventory_item.image,
        donation_quantity=donation_quantity,
        donation_expiration=inventory_item.expiration_date,
        donation_type=inventory_item.donation_type,
        food_category=food_category,
        donation_deadline=donation_deadline,
        status="accepted",  # Auto-accept donations to admin
        tracking_status="preparing",
        donor_name=current_user.name,
        donor_profile_picture=current_user.profile_picture
    )
    
    db.add(donation_request)
    
    # Update inventory quantity
    inventory_item.quantity -= donation_quantity
    
    # If quantity reaches 0, mark as donated
    if inventory_item.quantity <= 0:
        inventory_item.status = "donated"
    
    db.commit()
    db.refresh(donation_request)
    
    # Create notification for admin about the new donation
    notification_title = f"New Donation from {current_user.name}"
    notification_message = f"{current_user.name} has donated {donation_quantity} {inventory_item.name} to Scholars Of Sustenance. Tracking Status: Preparing"
    
    notification = admin_models.SystemNotification(
        title=notification_title,
        message=notification_message,
        notification_type="donation_received",
        target_user_id=admin_user.id,
        sent_by_admin_id=admin_user.id,
        send_email=False,
        send_in_app=True,
        sent_at=now_ph(),
        notification_data={
            "donation_id": donation_request.id,
            "donor_id": current_user.id,
            "donor_name": current_user.name,
            "donation_name": inventory_item.name,
            "quantity": donation_quantity,
            "tracking_status": "preparing"
        }
    )
    db.add(notification)
    db.flush()
    
    # Create notification receipt
    receipt = admin_models.NotificationReceipt(
        notification_id=notification.id,
        user_id=admin_user.id,
        is_read=False
    )
    db.add(receipt)
    db.commit()
    
    return {
        "message": "Donation created successfully",
        "donation_id": donation_request.id,
        "tracking_status": donation_request.tracking_status
    }


@router.get("/admin-donations")
def get_admin_donations(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Get all donations sent to admin.
    For admin: see all incoming donations from donors
    For donors: see their donations to admin
    """
    if current_user.role == "Admin":
        # Admin sees all incoming donations
        donations = db.query(models.AdminDonationRequest).order_by(
            models.AdminDonationRequest.timestamp.desc()
        ).all()
    elif current_user.role == "Donor":
        # Donor sees only their donations to admin
        donations = db.query(models.AdminDonationRequest).filter(
            models.AdminDonationRequest.donor_id == current_user.id
        ).order_by(
            models.AdminDonationRequest.timestamp.desc()
        ).all()
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Fetch admin user's profile picture
    admin_user = db.query(models.User).filter(models.User.role == "Admin").first()
    admin_profile_picture = admin_user.profile_picture if admin_user else None
    
    result = []
    for donation in donations:
        result.append({
            "id": donation.id,
            "donation_name": donation.donation_name,
            "donation_image": donation.donation_image,
            "donation_quantity": donation.donation_quantity,
            "donation_expiration": donation.donation_expiration,
            "donation_type": donation.donation_type,
            "status": donation.status,
            "tracking_status": donation.tracking_status,
            "timestamp": donation.timestamp,
            "donor_id": donation.donor_id,
            "donor_name": donation.donor_name,
            "donor_profile_picture": donation.donor_profile_picture,
            "tracking_completed_at": donation.tracking_completed_at,
            "admin_profile_picture": admin_profile_picture
        })
    
    return result


@router.put("/admin-donations/{donation_id}/tracking")
def update_admin_donation_tracking(
    donation_id: int,
    request: UpdateTrackingStatusRequest,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Update tracking status of admin donation.
    - Donor can update: preparing → ready_for_pickup → in_transit
    - Admin can update: in_transit → received → complete
    When status becomes "received", add item to admin inventory.
    """
    donation = db.query(models.AdminDonationRequest).filter(
        models.AdminDonationRequest.id == donation_id
    ).first()
    
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    
    # Validate tracking status
    valid_statuses = ["preparing", "ready_for_pickup", "in_transit", "received", "complete"]
    if request.tracking_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid tracking status")
    
    old_status = donation.tracking_status
    
    # Permission checks based on role and status
    if current_user.role == "Donor":
        # Donor can only update their own donations
        if donation.donor_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only update your own donations")
        
        # Donor can only update up to "in_transit"
        donor_allowed_statuses = ["preparing", "ready_for_pickup", "in_transit"]
        if request.tracking_status not in donor_allowed_statuses:
            raise HTTPException(status_code=403, detail="Donors can only update status up to 'in_transit'")
        
        # Validate state transition for donor
        if old_status == "preparing" and request.tracking_status not in ["ready_for_pickup"]:
            raise HTTPException(status_code=400, detail="Can only move from 'preparing' to 'ready_for_pickup'")
        if old_status == "ready_for_pickup" and request.tracking_status not in ["in_transit"]:
            raise HTTPException(status_code=400, detail="Can only move from 'ready_for_pickup' to 'in_transit'")
        if old_status == "in_transit":
            raise HTTPException(status_code=403, detail="Cannot change status once in transit. Admin will update next.")
            
    elif current_user.role == "Admin":
        # Admin can only update from "in_transit" onwards
        admin_allowed_statuses = ["in_transit", "received", "complete"]
        if request.tracking_status not in admin_allowed_statuses:
            raise HTTPException(status_code=403, detail="Admin can only update status from 'in_transit' onwards")
        
        # Validate state transition for admin
        if old_status == "in_transit" and request.tracking_status not in ["received", "complete"]:
            raise HTTPException(status_code=400, detail="Can only move from 'in_transit' to 'received' or 'complete'")
        if old_status == "received" and request.tracking_status not in ["complete"]:
            raise HTTPException(status_code=400, detail="Can only move from 'received' to 'complete'")
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update the status
    donation.tracking_status = request.tracking_status
    
    # If status is received OR complete, add to admin inventory (if not already added)
    if (request.tracking_status == "received" or request.tracking_status == "complete") and old_status != "received" and old_status != "complete":
        # Check if THIS specific donation was already added to inventory (by donation ID)
        existing_inventory = db.query(models.AdminInventory).filter(
            models.AdminInventory.donation_request_id == donation.id,
            models.AdminInventory.source == "donation"
        ).first()
        
        if not existing_inventory:
            # Get donor info for the inventory item
            donor = db.query(models.User).filter(
                models.User.id == donation.donor_id
            ).first()
            
            # Get inventory item to retrieve additional details
            inventory_item = db.query(models.DonorInventory).filter(
                models.DonorInventory.id == donation.bakery_inventory_id
            ).first()
            
            # Get admin user for bakery_id
            admin_user = db.query(models.User).filter(
                models.User.role == "Admin"
            ).first()
            
            if not admin_user:
                raise HTTPException(status_code=500, detail="Admin user not found")
            
            # Generate unique product ID for admin inventory
            product_id = generate_admin_product_id(db, donation.donation_name)
            
            # Create admin inventory item
            admin_inventory_item = models.AdminInventory(
                product_id=product_id,
                name=donation.donation_name,
                description=inventory_item.description if inventory_item else None,
                quantity=donation.donation_quantity,
                image=donation.donation_image,
                donation_type=donation.donation_type,
                category=inventory_item.category if inventory_item else None,
                food_category=donation.food_category,
                donation_deadline=donation.donation_deadline,
                condition=inventory_item.condition if inventory_item else None,
                source="donation",
                donated_by=donation.donor_id,
                donation_request_id=donation.id,  # Link to this specific donation
                received_date=date.today(),
                expiration_date=donation.donation_expiration
            )
            
            db.add(admin_inventory_item)
    
    # If status is complete, mark as finished
    if request.tracking_status == "complete":
        donation.tracking_completed_at = now_ph()
    
    db.commit()
    
    return {
        "message": "Tracking status updated successfully",
        "tracking_status": donation.tracking_status,
        "added_to_inventory": request.tracking_status == "received"
    }


@router.post("/donate")
def create_charity_donation_from_admin(
    request: CreateCharityDonationRequest,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Create a donation from admin inventory to charity.
    Admin donates items they received from donors to charities.
    """
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admin can create donations to charities")
    
    # Get admin inventory item
    inventory_item = db.query(models.AdminInventory).filter(
        models.AdminInventory.id == request.inventory_item_id
    ).first()
    
    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    if inventory_item.quantity < request.quantity:
        raise HTTPException(status_code=400, detail="Insufficient quantity in inventory")
    
    # Get charity user
    charity = db.query(models.User).filter(
        models.User.id == request.charity_id,
        models.User.role == "Charity"
    ).first()
    
    if not charity:
        raise HTTPException(status_code=404, detail="Charity not found")
    
    # Create direct donation record (admin to charity)
    donation = models.DirectDonation(
        bakery_inventory_id=None,  # No bakery inventory, this is from admin inventory
        charity_id=request.charity_id,
        name=inventory_item.name,
        image=inventory_item.image,
        quantity=request.quantity,
        threshold=0,  # Not applicable for admin donations
        creation_date=date.today(),
        expiration_date=inventory_item.expiration_date,
        donation_type=inventory_item.donation_type,
        description=inventory_item.description,
        btracking_status="preparing",
        donated_by=current_user.name  # Admin name
    )
    
    db.add(donation)
    
    # Update admin inventory quantity
    inventory_item.quantity -= request.quantity
    
    # If quantity reaches 0, we could optionally delete or mark it
    # For now, just leave it with 0 quantity
    
    db.commit()
    db.refresh(donation)
    
    return {
        "message": "Donation to charity created successfully",
        "donation_id": donation.id,
        "tracking_status": donation.btracking_status
    }


@router.delete("/admin-donations/{donation_id}")
def delete_admin_donation(
    donation_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    """Delete an admin donation request (admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admin can delete donations")
    
    donation = db.query(models.AdminDonationRequest).filter(
        models.AdminDonationRequest.id == donation_id
    ).first()
    
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    
    db.delete(donation)
    db.commit()
    
    return {"message": "Donation deleted successfully"}