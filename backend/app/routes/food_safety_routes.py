"""
Food Safety API Routes
Endpoints for food category management and safety checking
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from pydantic import BaseModel

from app import database, auth, food_safety

router = APIRouter(prefix="/food-safety", tags=["Food Safety"])


class FoodSafetyCheckRequest(BaseModel):
    expiration_date: date
    food_category: str


class FoodSafetyCheckResponse(BaseModel):
    is_expired: bool
    is_safe: bool
    days_until_deadline: int
    donation_deadline: date
    status: str
    category_name: str
    message: str


@router.get("/categories")
def get_food_categories():
    """
    Get all available food categories with their grace periods.
    Public endpoint - no authentication required.
    """
    categories = food_safety.get_all_categories()
    
    return {
        "categories": [
            {
                "value": key,
                "label": value["name"],
                "description": value["description"],
                "grace_period_days": value["grace_period_days"],
                "grace_period_text": f"{value['grace_period_days']} days after expiration"
            }
            for key, value in categories.items()
        ]
    }


@router.post("/check", response_model=FoodSafetyCheckResponse)
def check_food_safety(
    request: FoodSafetyCheckRequest,
    db: Session = Depends(database.get_db)
):
    """
    Check if a food item is safe for donation.
    Returns detailed safety status including deadline and warnings.
    """
    status = food_safety.get_safety_status(
        expiration_date=request.expiration_date,
        food_category=request.food_category
    )
    
    # Generate user-friendly message
    if status["status"] == "fresh":
        message = f"✅ Safe to donate. Fresh product with {status['days_until_deadline']} days until donation deadline."
    elif status["status"] == "near_expiry":
        message = f"⚠️ Near expiration. {status['days_until_deadline']} days remaining until donation deadline. Donate soon!"
    elif status["status"] == "expired_safe":
        message = f"✓ Still safe to donate. Expired but within grace period ({status['days_until_deadline']} days remaining)."
    else:
        message = f"❌ Not safe for donation. Past donation deadline by {abs(status['days_until_deadline'])} days."
    
    return FoodSafetyCheckResponse(
        **status,
        message=message
    )


@router.get("/admin-inventory-status")
def get_admin_inventory_safety_status(
    db: Session = Depends(database.get_db),
    current_user = Depends(auth.get_current_user)
):
    """
    Get safety status of all items in admin inventory.
    Admin only endpoint.
    """
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from app import models
    
    # Get all admin inventory items with expiration dates
    inventory_items = db.query(models.AdminInventory).filter(
        models.AdminInventory.expiration_date.isnot(None),
        models.AdminInventory.quantity > 0
    ).all()
    
    results = []
    for item in inventory_items:
        status = food_safety.get_safety_status(
            expiration_date=item.expiration_date,
            food_category=item.food_category if hasattr(item, 'food_category') else 'other'
        )
        
        results.append({
            "id": item.id,
            "name": item.name,
            "quantity": item.quantity,
            "expiration_date": item.expiration_date,
            "food_category": item.food_category if hasattr(item, 'food_category') else 'other',
            "donation_deadline": status["donation_deadline"],
            "days_remaining": status["days_until_deadline"],
            "status": status["status"],
            "is_safe": status["is_safe"]
        })
    
    # Sort by days remaining (urgent items first)
    results.sort(key=lambda x: x["days_remaining"])
    
    return {
        "total_items": len(results),
        "unsafe_items": len([r for r in results if not r["is_safe"]]),
        "expiring_soon": len([r for r in results if 0 < r["days_remaining"] <= 7]),
        "items": results
    }
