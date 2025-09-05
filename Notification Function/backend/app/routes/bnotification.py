from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta
from app import models, database, auth

router = APIRouter()

# --- Fetch product notifications ---
@router.get("/notifications")
def get_notifications(
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
    user_id = current_user.id
    today = datetime.now()

    # Nearing expiration (within 2 days)
    nearing_expiration = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.bakery_id == user_id,
        models.BakeryInventory.expiration_date > today,
        models.BakeryInventory.expiration_date <= today + timedelta(days=2)
    ).all()

    # Already expired
    expired = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.bakery_id == user_id,
        models.BakeryInventory.expiration_date <= today
    ).all()

    notifications = []

    for product in nearing_expiration:
        notif_id = f"near-{product.id}"
        read = db.query(models.NotificationRead).filter_by(user_id=user_id, notif_id=notif_id).first() is not None
        notifications.append({
            "type": "warning",
            "message": f"{product.name} is nearing expiration and will be automatically uploaded to donation ({product.expiration_date.strftime('%Y-%m-%d')})",
            "id": notif_id,
            "product_id": product.id,
            "expiration_date": product.expiration_date,
            "read": read
        })

    for product in expired:
        notif_id = f"expired-{product.id}"
        read = db.query(models.NotificationRead).filter_by(user_id=user_id, notif_id=notif_id).first() is not None
        notifications.append({
            "type": "danger",
            "message": f"{product.name} has expired ({product.expiration_date.strftime('%Y-%m-%d')})",
            "id": notif_id,
            "product_id": product.id,
            "expiration_date": product.expiration_date,
            "read": read
        })

    # Sort: unread first, then by newest expiration_date
    notifications.sort(key=lambda n: (n["read"], n["expiration_date"]), reverse=True)
    return {"notifications": notifications}


# --- Mark notification as read ---
@router.patch("/notifications/{notif_id}/read")
def mark_notification_as_read(
    notif_id: str,
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
    user_id = current_user.id

    # Split product vs message notifications
    if notif_id.startswith("msg-"):
        # Check if an entry already exists
        read_entry = db.query(models.NotificationRead).filter_by(
            user_id=user_id, notif_id=notif_id
        ).first()
        
        now = datetime.utcnow()
        if read_entry:
            # Update timestamp to now
            read_entry.read_at = now
        else:
            read_entry = models.NotificationRead(
                user_id=user_id,
                notif_id=notif_id,
                read_at=now
            )
            db.add(read_entry)

        db.commit()
        return {"status": "ok", "id": notif_id, "read_at": now}

    # Product notifications
    read_entry = db.query(models.NotificationRead).filter_by(
        user_id=user_id, notif_id=notif_id
    ).first()

    now = datetime.utcnow()
    if read_entry:
        read_entry.read_at = now
    else:
        read_entry = models.NotificationRead(
            user_id=user_id,
            notif_id=notif_id,
            read_at=now
        )
        db.add(read_entry)

    db.commit()
    return {"status": "ok", "id": notif_id, "read_at": now}

# Fetch product details 
@router.get("/get_product/{id}")
def get_product(
    id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
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

# Fetch all notifications (products + messages)
@router.get("/notifications/all")
def get_all_notifications(
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
    user_id = current_user.id
    products_resp = get_notifications(db=db, current_user=current_user)

    # Messages
    messages = db.query(models.Message).filter(
        or_(models.Message.sender_id == user_id, models.Message.receiver_id == user_id)
    ).order_by(models.Message.timestamp.desc()).limit(200).all()

    latest_by_sender = {}

    for m in messages:
        if m.sender_id == user_id:
            continue

        notif_id = f"msg-{m.sender_id}"

        # Fetch last read time for this sender
        last_read = db.query(models.NotificationRead).filter_by(
            user_id=user_id, notif_id=notif_id
        ).order_by(models.NotificationRead.read_at.desc()).first()

        if last_read and m.timestamp <= last_read.read_at:
            # Message already accounted for in read notification
            continue

        # Only keep the latest message per sender
        if notif_id in latest_by_sender:
            continue

        sender = db.query(models.User).filter(models.User.id == m.sender_id).first()
        receiver = db.query(models.User).filter(models.User.id == m.receiver_id).first()

        is_card = getattr(m, "is_card", False)
        preview = m.content[:30] + ("..." if len(m.content) > 30 else "")
        if is_card:
            try:
                parsed = m.content if isinstance(m.content, dict) else eval(m.content)
                charity_name = parsed.get("charity_name") or sender.name or "A charity"
                preview = f"{charity_name} sent you a donation request"
            except Exception:
                preview = "Donation request"

        latest_by_sender[notif_id] = {
            "id": notif_id,
            "type": "message_card" if is_card else "message",
            "preview": preview,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "sender_name": sender.name if sender else f"User {m.sender_id}",
            "sender_profile_picture": sender.profile_picture if sender else None,
            "receiver_name": receiver.name if receiver else f"User {m.receiver_id}",
            "receiver_profile_picture": receiver.profile_picture if receiver else None,
            "timestamp": m.timestamp.isoformat(),
            "read": False
        }

    latest_messages = sorted(latest_by_sender.values(), key=lambda x: x["timestamp"], reverse=True)

    return {
        "products": products_resp["notifications"],
        "messages": latest_messages
    }
