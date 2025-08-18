from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database, auth
from datetime import datetime, timedelta

router = APIRouter()

# Temporary in-memory store for read states
# { user_id: { notif_id: True/False } }
read_states = {}

@router.get("/notifications")
def get_notifications(
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
    bakery_id = current_user.id
    today = datetime.now()

    # Nearing expiration (within 2 days)
    nearing_expiration = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.bakery_id == bakery_id,
        models.BakeryInventory.expiration_date > today,
        models.BakeryInventory.expiration_date <= today + timedelta(days=2)
    ).all()

    # Already expired
    expired = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.bakery_id == bakery_id,
        models.BakeryInventory.expiration_date <= today
    ).all()

    # Initialize user state if missing
    if bakery_id not in read_states:
        read_states[bakery_id] = {}

    notifications = []

    for product in nearing_expiration:
        notif_id = f"near-{product.id}"
        notifications.append({
            "type": "warning",
            "message": f"{product.name} is nearing expiration and will be automatically uploaded to donation ({product.expiration_date.strftime('%Y-%m-%d')})",
            "id": notif_id,
            "product_id": product.id,
            "expiration_date": product.expiration_date, 
            "read": read_states[bakery_id].get(notif_id, False)
        })

    for product in expired:
        notif_id = f"expired-{product.id}"
        notifications.append({
            "type": "danger",
            "message": f"{product.name} has expired ({product.expiration_date.strftime('%Y-%m-%d')})",
            "id": notif_id,
            "product_id": product.id,
            "expiration_date": product.expiration_date,
            "read": read_states[bakery_id].get(notif_id, False)
        })

    # Sort: unread first, then by newest expiration_date
    notifications.sort(
        key=lambda n: (n["read"], n["expiration_date"]),
        reverse=True
    )

    return {"notifications": notifications}

@router.patch("/notifications/{notif_id}/read")
def mark_notification_as_read(
    notif_id: str,
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
    bakery_id = current_user.id

    # notif_id looks like "near-5" or "expired-5"
    try:
        _, product_id = notif_id.split("-")
        product_id = int(product_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification id")

    # Make sure product belongs to this bakery
    product = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == product_id,
        models.BakeryInventory.bakery_id == bakery_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Mark as read in memory
    if bakery_id not in read_states:
        read_states[bakery_id] = {}
    read_states[bakery_id][notif_id] = True

    return {"status": "ok", "id": notif_id, "read": True}

# Endpoint to fetch product details by ID
@router.get("/get_product/{id}")
def get_product(id: int, db: Session = Depends(database.get_db), current_user=Depends(auth.get_current_user)):
    product = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == id,
        models.BakeryInventory.bakery_id == current_user.id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return {
        "product": {
            "id": product.id,
            "name": product.name,
            "quantity": product.quantity,
            "creation_date": product.creation_date.strftime("%Y-%m-%d"),
            "expiration_date": product.expiration_date.strftime("%Y-%m-%d"),
            "threshold": product.threshold,
            "image": product.image
        }
    }
