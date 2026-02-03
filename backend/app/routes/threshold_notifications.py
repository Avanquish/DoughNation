from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta, date
from pydantic import BaseModel

from app import models, database, auth

router = APIRouter()


class ThresholdProductResponse(BaseModel):
    id: int
    product_id: str
    name: str
    image: str | None
    quantity: int
    creation_date: date
    expiration_date: date | None
    threshold: int
    description: str | None
    donation_type: str
    days_until_threshold: int
    days_until_expiration: int
    
    class Config:
        from_attributes = True


class ThresholdNotificationAction(BaseModel):
    product_id: int
    action: str  # "donate" or "dismiss"


@router.get("/threshold-alerts", response_model=List[ThresholdProductResponse])
def get_threshold_alerts(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Get all products that have reached their threshold date
    and haven't expired yet. These should trigger modal alerts.
    """
    if current_user.role != "Donor":
        raise HTTPException(status_code=403, detail="Only donors can access threshold alerts")
    
    bakery_id = current_user.id
    today = date.today()
    
    # Get all available inventory items for this bakery
    inventory_items = db.query(models.DonorInventory).filter(
        models.DonorInventory.bakery_id == bakery_id,
        models.DonorInventory.status == "available",
        models.DonorInventory.expiration_date.isnot(None)
    ).all()
    
    threshold_products = []
    
    for item in inventory_items:
        # Calculate days from creation to expiration
        days_total = (item.expiration_date - item.creation_date).days
        
        # Calculate threshold date (threshold days BEFORE expiration)
        threshold_date = item.expiration_date - timedelta(days=item.threshold)
        
        # Calculate days until threshold and expiration
        days_until_threshold = (threshold_date - today).days
        days_until_expiration = (item.expiration_date - today).days
        
        # Product should show alert if:
        # 1. Today is on or after the threshold date (days_until_threshold <= 0)
        # 2. Product hasn't expired yet (days_until_expiration >= 0)
        if days_until_threshold <= 0 and days_until_expiration >= 0:
            threshold_products.append(
                ThresholdProductResponse(
                    id=item.id,
                    product_id=item.product_id,
                    name=item.name,
                    image=item.image,
                    quantity=item.quantity,
                    creation_date=item.creation_date,
                    expiration_date=item.expiration_date,
                    threshold=item.threshold,
                    description=item.description,
                    donation_type=item.donation_type,
                    days_until_threshold=days_until_threshold,
                    days_until_expiration=days_until_expiration
                )
            )
    
    return threshold_products


@router.post("/threshold-action")
def record_threshold_action(
    action_data: ThresholdNotificationAction,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Record user action on threshold notification (donate or dismiss)
    Note: This just logs the action. The modal will continue to show
    until the product expires, as per requirements.
    """
    if current_user.role != "Donor":
        raise HTTPException(status_code=403, detail="Only donors can perform this action")
    
    bakery_id = current_user.id
    product_id = action_data.product_id
    action = action_data.action
    
    # Verify product belongs to this bakery
    product = db.query(models.DonorInventory).filter(
        models.DonorInventory.id == product_id,
        models.DonorInventory.bakery_id == bakery_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if notification record exists
    notification = db.query(models.ThresholdNotification).filter(
        models.ThresholdNotification.bakery_id == bakery_id,
        models.ThresholdNotification.product_id == product_id
    ).first()
    
    if not notification:
        # Create new notification record
        notification = models.ThresholdNotification(
            bakery_id=bakery_id,
            product_id=product_id,
            dismissed=(action == "dismiss"),
            donated=(action == "donate")
        )
        db.add(notification)
    else:
        # Update existing record
        notification.shown_at = datetime.now()
        if action == "dismiss":
            notification.dismissed = True
        elif action == "donate":
            notification.donated = True
    
    db.commit()
    
    return {
        "message": f"Action '{action}' recorded for product {product.name}",
        "product_id": product_id,
        "action": action,
        "note": "Modal will continue to appear until product expires"
    }


@router.get("/threshold-stats")
def get_threshold_stats(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Get statistics about threshold notifications for the bakery
    """
    if current_user.role != "Donor":
        raise HTTPException(status_code=403, detail="Only donors can access threshold stats")
    
    bakery_id = current_user.id
    
    # Count products at threshold
    threshold_products = db.query(models.DonorInventory).filter(
        models.DonorInventory.bakery_id == bakery_id,
        models.DonorInventory.status == "available",
        models.DonorInventory.expiration_date.isnot(None)
    ).all()
    
    today = date.today()
    at_threshold_count = 0
    
    for item in threshold_products:
        threshold_date = item.creation_date + timedelta(days=item.threshold)
        days_until_expiration = (item.expiration_date - today).days
        
        if today >= threshold_date and days_until_expiration >= 0:
            at_threshold_count += 1
    
    # Count notification actions
    total_notifications = db.query(models.ThresholdNotification).filter(
        models.ThresholdNotification.bakery_id == bakery_id
    ).count()
    
    dismissed_count = db.query(models.ThresholdNotification).filter(
        models.ThresholdNotification.bakery_id == bakery_id,
        models.ThresholdNotification.dismissed == True
    ).count()
    
    donated_count = db.query(models.ThresholdNotification).filter(
        models.ThresholdNotification.bakery_id == bakery_id,
        models.ThresholdNotification.donated == True
    ).count()
    
    return {
        "products_at_threshold": at_threshold_count,
        "total_notifications_shown": total_notifications,
        "times_dismissed": dismissed_count,
        "times_donated": donated_count
    }