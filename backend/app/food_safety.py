"""
Food safety and donation deadline calculator
Handles grace periods for different food categories after expiration date
"""
from datetime import date, timedelta
from typing import Optional

# Food categories with their grace periods (in days) after expiration
FOOD_CATEGORIES = {
    "canned_goods": {
        "name": "Canned Goods",
        "grace_period_days": 60,  # 2 months
        "description": "Canned vegetables, fruits, soups, etc."
    },
    "bread": {
        "name": "Bread & Baked Goods",
        "grace_period_days": 7,  # 1 week
        "description": "Fresh bread, pastries, baked items"
    },
    "dry_goods": {
        "name": "Dry Goods",
        "grace_period_days": 30,  # 1 month
        "description": "Pasta, rice, cereals, flour, etc."
    },
    "packaged_snacks": {
        "name": "Packaged Snacks",
        "grace_period_days": 30,  # 1 month
        "description": "Chips, crackers, cookies in sealed packages"
    },
    "preserved_foods": {
        "name": "Preserved Foods",
        "grace_period_days": 45,  # 1.5 months
        "description": "Jams, pickles, preserved items"
    },
    "beverages": {
        "name": "Beverages",
        "grace_period_days": 30,  # 1 month
        "description": "Juices, soft drinks, bottled beverages"
    },
    "condiments": {
        "name": "Condiments & Sauces",
        "grace_period_days": 45,  # 1.5 months
        "description": "Ketchup, soy sauce, vinegar, etc."
    },
    "frozen_foods": {
        "name": "Frozen Foods",
        "grace_period_days": 14,  # 2 weeks
        "description": "Frozen vegetables, meat, ready meals"
    },
    "dairy": {
        "name": "Dairy Products",
        "grace_period_days": 3,  # 3 days (very short)
        "description": "Milk, cheese, yogurt (handle with care)"
    },
    "other": {
        "name": "Other Food Items",
        "grace_period_days": 30,  # 1 month (default)
        "description": "Other food items not categorized above"
    },
    "non_food": {
        "name": "Non-Food Items",
        "grace_period_days": 36500,  # 100 years (effectively no expiration)
        "description": "Non-food items with no expiration date"
    }
}


def calculate_donation_deadline(
    expiration_date: date,
    food_category: Optional[str] = "other"
) -> date:
    """
    Calculate the actual deadline for donating a food item.
    
    Args:
        expiration_date: The printed expiration date on the package
        food_category: Category of food (e.g., 'canned_goods', 'bread')
        
    Returns:
        The final date until which the item can be safely donated
    """
    if not food_category or food_category not in FOOD_CATEGORIES:
        food_category = "other"
    
    # Non-food items have no expiration, return a far future date
    if food_category == "non_food":
        return expiration_date + timedelta(days=36500)  # 100 years
    
    grace_period_days = FOOD_CATEGORIES[food_category]["grace_period_days"]
    donation_deadline = expiration_date + timedelta(days=grace_period_days)
    
    return donation_deadline


def is_safe_for_donation(
    expiration_date: date,
    food_category: Optional[str] = "other",
    check_date: Optional[date] = None
) -> bool:
    """
    Check if a food item is still safe for donation.
    
    Args:
        expiration_date: The printed expiration date
        food_category: Category of food
        check_date: Date to check against (default: today)
        
    Returns:
        True if item is still safe to donate, False otherwise
    """
    if check_date is None:
        check_date = date.today()
    
    donation_deadline = calculate_donation_deadline(expiration_date, food_category)
    return check_date <= donation_deadline


def get_days_until_donation_deadline(
    expiration_date: date,
    food_category: Optional[str] = "other",
    check_date: Optional[date] = None
) -> int:
    """
    Get the number of days until the donation deadline.
    
    Args:
        expiration_date: The printed expiration date
        food_category: Category of food
        check_date: Date to check from (default: today)
        
    Returns:
        Number of days until deadline (negative if past deadline)
    """
    if check_date is None:
        check_date = date.today()
    
    donation_deadline = calculate_donation_deadline(expiration_date, food_category)
    days_remaining = (donation_deadline - check_date).days
    
    return days_remaining


def get_safety_status(
    expiration_date: date,
    food_category: Optional[str] = "other",
    check_date: Optional[date] = None
) -> dict:
    """
    Get comprehensive safety status for a food item.
    
    Returns:
        Dictionary with safety information including:
        - is_expired: Has the printed expiration date passed?
        - is_safe: Is it still within donation grace period?
        - days_until_deadline: Days remaining until donation deadline
        - donation_deadline: Final date for donation
        - status: 'fresh', 'near_expiry', 'expired_safe', 'unsafe', 'non_food'
    """
    if check_date is None:
        check_date = date.today()
    
    # Special handling for non-food items
    if food_category == "non_food":
        donation_deadline = calculate_donation_deadline(expiration_date, food_category)
        return {
            "is_expired": False,
            "is_safe": True,
            "days_until_deadline": 999999,  # Effectively infinite
            "donation_deadline": donation_deadline,
            "status": "non_food",
            "category_name": FOOD_CATEGORIES["non_food"]["name"]
        }
    
    donation_deadline = calculate_donation_deadline(expiration_date, food_category)
    is_expired = check_date > expiration_date
    is_safe = check_date <= donation_deadline
    days_until_deadline = (donation_deadline - check_date).days
    
    # Determine status
    if not is_expired:
        if days_until_deadline > 7:
            status = "fresh"
        else:
            status = "near_expiry"
    else:
        if is_safe:
            status = "expired_safe"
        else:
            status = "unsafe"
    
    return {
        "is_expired": is_expired,
        "is_safe": is_safe,
        "days_until_deadline": days_until_deadline,
        "donation_deadline": donation_deadline,
        "status": status,
        "category_name": FOOD_CATEGORIES.get(food_category, FOOD_CATEGORIES["other"])["name"]
    }


def get_all_categories() -> dict:
    """Get all available food categories with their details."""
    return FOOD_CATEGORIES
