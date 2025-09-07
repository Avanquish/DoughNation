from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from app import models, database, auth

router = APIRouter()


# --- Mark notification as read (messages only) ---
@router.patch("/notifications/{notif_id}/read")
def mark_notification_as_read(
    notif_id: str,
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
    user_id = current_user.id

    # Only handle message notifications
    if not notif_id.startswith("msg-"):
        raise HTTPException(status_code=400, detail="Invalid notification ID")

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


# --- Fetch all message notifications ---
@router.get("/notifications/charity")
def get_message_notifications(
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
    user_id = current_user.id

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
                bakery_name = parsed.get("bakery_name") or sender.name or "A bakery"
                preview = f"{bakery_name} Accept donation request"
            except Exception:
                preview = "Accept request"

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

    # --- Donations (NEW logic for dynamic notifications) ---
    donations = []
    # All NotificationRead entries for donations
    read_entries = db.query(models.NotificationRead).filter(
        models.NotificationRead.user_id == user_id,
        models.NotificationRead.notif_id.like("donation-%")
    ).all()
    read_ids = {int(r.notif_id.split("-")[1]) for r in read_entries if r.notif_id.startswith("donation-")}

    # All donations in DB
    all_donations = db.query(models.Donation).order_by(models.Donation.creation_date.desc()).all()
    for donation in all_donations:
        bakery = db.query(models.User).filter(models.User.id == donation.bakery_id).first()
        # Only for this user: if this donation hasn't been marked as read yet
        if donation.id not in read_ids:
            donations.append({
                "id": f"donation-{donation.id}-to-{user_id}",
                "donation_id": donation.id,
                "name": donation.name,
                "quantity": donation.quantity,
                "timestamp": donation.creation_date.isoformat(),
                "read": False,
                "bakery_name": bakery.name if bakery else "Unknown bakery",
                "bakery_profile_picture": bakery.profile_picture if bakery else None
            })
        else:
            # Already read
            donations.append({
                "id": f"donation-{donation.id}-to-{user_id}",
                "donation_id": donation.id,
                "name": donation.name,
                "quantity": donation.quantity,
                "timestamp": donation.creation_date.isoformat(),
                "read": True,
                "bakery_name": bakery.name if bakery else "Unknown bakery",
                "bakery_profile_picture": bakery.profile_picture if bakery else None
            })
            
    # --- Direct/Received Donations ---
    received_donations = []
    all_received = db.query(models.DirectDonation).filter_by(
        charity_id=user_id
    ).order_by(models.DirectDonation.id.desc()).all()

    for rd in all_received:
        inventory = db.query(models.BakeryInventory).filter_by(id=rd.bakery_inventory_id).first()
        bakery = db.query(models.User).filter_by(id=inventory.bakery_id).first() if inventory else None
        received_donations.append({
            "id": f"received-{rd.id}-to-{user_id}",
            "donation_id": rd.id,
            "name": rd.name,
            "quantity": rd.quantity,
            "timestamp": datetime.utcnow().isoformat(),
            "read": rd.id in read_ids,
            "bakery_name": bakery.name if bakery else "Unknown bakery",
            "bakery_profile_picture": bakery.profile_picture if bakery else None
        })

    # ------------------- Accept Donation Cards -------------------
    accept_cards = {}
    for m in messages:
        if not getattr(m, "is_card", False):
            continue

        if m.id in accept_cards:
            continue

        #  Identify the bakery (opposite side of the current user)
        if m.sender_id == user_id:
            # current user (charity) sent it → bakery is receiver
            bakery = db.query(models.User).filter(models.User.id == m.receiver_id).first()
        else:
            # current user is receiver → bakery is sender
            bakery = db.query(models.User).filter(models.User.id == m.sender_id).first()

        try:
            parsed = m.content if isinstance(m.content, dict) else eval(m.content)
            bakery_name = parsed.get("bakery_name") or (bakery.name if bakery else "A bakery")
            bakery_picture = parsed.get("bakery_profile_picture") or (bakery.profile_picture if bakery else None)
        except Exception:
            bakery_name = bakery.name if bakery else "A bakery"
            bakery_picture = bakery.profile_picture if bakery else None

        accept_cards[m.id] = {
            "id": m.id,
            "donation_id": m.id,
            "name": f"{bakery_name} accepted your request",
            "quantity": None,
            "timestamp": m.timestamp.isoformat(),
            "read": False,
            "bakery_name": bakery_name,
            "bakery_profile_picture": bakery_picture,
        }

    # Merge into received_donations
    received_donations.extend(accept_cards.values())

    # Sort donations: unread first, then by newest
    donations.sort(key=lambda d: (d["read"], -datetime.fromisoformat(d["timestamp"]).timestamp()))
    received_donations.sort(key=lambda d: (d["read"], -datetime.fromisoformat(d["timestamp"]).timestamp()))

    return {
        "messages": latest_messages,
        "donations" : donations,
        "received_donations": received_donations}


