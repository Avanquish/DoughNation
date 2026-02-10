"""
Admin inventory and donation routes
Handles admin inventory management and donations to charities
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import os
import shutil
from app import models, schemas, database, auth
from app.product_id_generator import generate_admin_product_id
from app.timezone_utils import now_ph

router = APIRouter(prefix="/admin", tags=["Admin Inventory"])


@router.get("/inventory/", response_model=List[dict])
def get_admin_inventory(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_admin)
):
    """Get all items in admin inventory"""
    items = db.query(models.AdminInventory).order_by(
        models.AdminInventory.created_at.desc()
    ).all()
    
    return [
        {
            "id": item.id,
            "product_id": item.product_id,
            "name": item.name,
            "description": item.description,
            "quantity": item.quantity,
            "image": item.image,
            "donation_type": item.donation_type,
            "category": item.category,
            "food_category": item.food_category,
            "donation_deadline": item.donation_deadline,
            "condition": item.condition,
            "source": item.source,
            "donated_by": item.donated_by,
            "donation_request_id": item.donation_request_id,
            "received_date": item.received_date,
            "expiration_date": item.expiration_date,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        }
        for item in items
    ]


@router.post("/inventory/")
def add_inventory_item(
    name: str = Form(...),
    quantity: int = Form(...),
    donation_type: str = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    expiration_date: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_admin)
):
    """Manually add item to admin inventory"""
    product_id = generate_admin_product_id(db, name)
    
    # Handle image upload
    image_path = None
    if image and image.filename:
        upload_dir = "uploads/admin_inventory"
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{product_id}_{image.filename}"
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_path = f"/{upload_dir}/{filename}"
    
    # Parse expiration date if provided
    exp_date = None
    if expiration_date:
        try:
            exp_date = datetime.strptime(expiration_date, "%Y-%m-%d").date()
        except:
            pass
    
    new_item = models.AdminInventory(
        product_id=product_id,
        name=name,
        description=description,
        quantity=quantity,
        donation_type=donation_type,
        category=category,
        image=image_path,
        source="manual",
        received_date=date.today(),
        expiration_date=exp_date
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return {"message": "Item added successfully", "product_id": product_id}


@router.put("/inventory/{item_id}")
def update_inventory_item(
    item_id: int,
    name: Optional[str] = Form(None),
    quantity: Optional[int] = Form(None),
    donation_type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    expiration_date: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_admin)
):
    """Update admin inventory item"""
    db_item = db.query(models.AdminInventory).filter(
        models.AdminInventory.id == item_id
    ).first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Handle image upload
    if image and image.filename:
        upload_dir = "uploads/admin_inventory"
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{db_item.product_id}_{image.filename}"
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        db_item.image = f"/{upload_dir}/{filename}"
    
    if name is not None:
        db_item.name = name
    if description is not None:
        db_item.description = description
    if quantity is not None:
        db_item.quantity = quantity
    if donation_type is not None:
        db_item.donation_type = donation_type
    if category is not None:
        db_item.category = category
    if expiration_date is not None:
        try:
            db_item.expiration_date = datetime.strptime(expiration_date, "%Y-%m-%d").date()
        except:
            pass
    
    db_item.updated_at = now_ph()
    
    db.commit()
    
    return {"message": "Item updated successfully"}


@router.delete("/inventory/{item_id}")
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_admin)
):
    """Delete item from admin inventory"""
    db_item = db.query(models.AdminInventory).filter(
        models.AdminInventory.id == item_id
    ).first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(db_item)
    db.commit()
    
    return {"message": "Item deleted successfully"}


# Donation endpoint moved to admin_donation_routes.py to avoid route conflicts


@router.get("/outgoing-donations")
def get_outgoing_donations(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_admin)
):
    """Get all donations sent by admin to charities"""
    # Get donations from DonationRequest table (old approach)
    donation_requests = db.query(models.DonationRequest).filter(
        models.DonationRequest.bakery_id == current_user.id
    ).order_by(models.DonationRequest.timestamp.desc()).all()
    
    # Get donations from DirectDonation table (new approach for admin donations)
    direct_donations = db.query(models.DirectDonation).filter(
        models.DirectDonation.donated_by == current_user.name
    ).order_by(models.DirectDonation.created_at.desc()).all()
    
    result = []
    
    # Process DonationRequest records
    for donation in donation_requests:
        charity = db.query(models.User).filter(
            models.User.id == donation.charity_id
        ).first()
        
        result.append({
            "id": donation.id,
            "donation_name": donation.donation_name,
            "donation_image": donation.donation_image,
            "donation_quantity": donation.donation_quantity,
            "donation_expiration": donation.donation_expiration,
            "donation_type": donation.donation_type,
            "tracking_status": donation.tracking_status,
            "status": donation.status,
            "timestamp": donation.timestamp,
            "charity_id": donation.charity_id,
            "charity_name": charity.name if charity else None,
            "charity_profile_picture": charity.profile_picture if charity else None,
            "source": "donation_request"
        })
    
    # Process DirectDonation records
    for donation in direct_donations:
        charity = db.query(models.User).filter(
            models.User.id == donation.charity_id
        ).first()
        
        result.append({
            "id": donation.id,
            "donation_name": donation.name,
            "donation_image": donation.image,
            "donation_quantity": donation.quantity,
            "donation_expiration": donation.expiration_date,
            "donation_type": donation.donation_type,
            "tracking_status": donation.btracking_status,
            "status": "accepted",  # Direct donations are auto-accepted
            "timestamp": donation.created_at,
            "charity_id": donation.charity_id,
            "charity_name": charity.name if charity else None,
            "charity_profile_picture": charity.profile_picture if charity else None,
            "source": "direct_donation"
        })
    
    # Sort combined results by timestamp descending
    result.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return result
