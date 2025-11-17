from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta, time
from app import models, database, auth, admin_models

# For geofence
from math import radians, cos, sin, asin, sqrt # For geofence calculation helper
from fastapi import BackgroundTasks
import math, json
from app.database import get_db

from app.models import User, Donation, DonationRequest, NotificationRead

router = APIRouter()


# --- Mark notification as read ---
@router.patch("/notifications/{notif_id}/read")
def mark_notification_as_read(
    notif_id: str,
    db: Session = Depends(database.get_db),
    current_user=Depends(auth.get_current_user)
):
    user_id = current_user.id

    # Handle system notifications
    if notif_id.startswith("system-"):
        system_notif_id = int(notif_id.replace("system-", ""))
        receipt = db.query(admin_models.NotificationReceipt).filter(
            admin_models.NotificationReceipt.notification_id == system_notif_id,
            admin_models.NotificationReceipt.user_id == user_id
        ).first()
        
        if receipt:
            receipt.is_read = True
            receipt.read_at = datetime.utcnow()
            db.commit()
            return {"status": "ok", "id": notif_id, "read_at": receipt.read_at}
        else:
            raise HTTPException(status_code=404, detail="Notification receipt not found")
    
    # Handle message notifications
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

        preview = None

        try:
            # If flagged as card OR content looks like JSON
            if is_card or (isinstance(m.content, str) and m.content.strip().startswith("{")):
                parsed = m.content if isinstance(m.content, dict) else json.loads(m.content)

                type_labels = {
                    "confirmed_donation": "Confirmed Donation",
                    "pending_donation": "Pending Donation",
                    "rejected_donation": "Rejected Donation",
                }

                donation_type = parsed.get("type")
                label = type_labels.get(donation_type, "Donation Update")

                bakery_name = parsed.get("bakery_name") or sender.name or "A bakery"
                preview = f" {label}"
            else:
                # Fallback for plain text
                preview = m.content[:30] + ("..." if len(m.content) > 30 else "")
        except Exception as e:
            print("[WARN] failed to parse message content:", e)
            preview = "Donation update"

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
            # Calculate distance
            distance_km = None
            if bakery and current_user and bakery.latitude and bakery.longitude and current_user.latitude and current_user.longitude:
                distance_km = round(haversine(
                    bakery.latitude, bakery.longitude,
                    current_user.latitude, current_user.longitude
                ), 1)
                
            donations.append({
                "id": f"donation-{donation.id}-to-{user_id}",
                "donation_id": donation.id,
                "name": donation.name,
                "quantity": donation.quantity,
                "timestamp": donation.creation_date.isoformat(),
                "read": False,
                "bakery_name": bakery.name if bakery else "Unknown bakery",
                "bakery_profile_picture": bakery.profile_picture if bakery else None,
                "distance_km": distance_km  #distance 
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
                "bakery_profile_picture": bakery.profile_picture if bakery else None,
                "distance_km": None  # Already read
            })

    # --- Direct/Received Donations ---
    received_donations = []

    # Direct donations (Bakery -> Charity)
    all_received = (
        db.query(models.DirectDonation)
        .filter_by(charity_id=user_id)
        .order_by(models.DirectDonation.id.desc())
        .all()
    )

    for rd in all_received:
        inventory = db.query(models.BakeryInventory).filter_by(id=rd.bakery_inventory_id).first()
        bakery = db.query(models.User).filter_by(id=inventory.bakery_id).first() if inventory else None
        received_donations.append({
            "id": f"direct-{rd.id}-to-{user_id}",
            "donation_id": rd.id,
            "name": rd.name,
            "quantity": rd.quantity,
            "timestamp": datetime.utcnow().isoformat(),
            "read": rd.id in read_ids,
            "bakery_name": bakery.name if bakery else "Unknown bakery",
            "bakery_profile_picture": bakery.profile_picture if bakery else None,
            "type": "direct",
            "message": f"{bakery.name if bakery else 'A bakery'} sent a donation"
        })

    # Accepted requests (Charity -> Bakery)
    accepted_requests = (
        db.query(models.DonationRequest)
        .filter_by(charity_id=user_id, status="accepted")
        .order_by(models.DonationRequest.id.desc())
        .all()
    )

    for ar in accepted_requests:
        bakery = db.query(models.User).filter_by(id=ar.bakery_id).first()
        received_donations.append({
            "id": f"request-{ar.id}-to-{user_id}",
            "request_id": ar.id,
            "donation_id": ar.donation_id,
            "inventory_id": ar.bakery_inventory_id,  
            "name": ar.donation_name,
            "quantity": ar.donation_quantity,
            "timestamp": ar.timestamp.isoformat(),
            "read": False,
            "bakery_name": ar.bakery_name or (bakery.name if bakery else "A bakery"),
            "bakery_profile_picture": ar.bakery_profile_picture or (bakery.profile_picture if bakery else None),
            "type": "request",
            "status": ar.status,
            "message": f"{bakery.name if bakery else 'A bakery'} accepted your request"
        })

    # Sort donations: unread first, then by newest
    donations.sort(key=lambda d: (d["read"], -datetime.fromisoformat(d["timestamp"]).timestamp()))
    received_donations.sort(key=lambda d: (d["read"], -datetime.fromisoformat(d["timestamp"]).timestamp()))

    # --- Geofence Notifications ---
    geofence_notifs = []
    geofence_entries = db.query(models.NotificationRead).filter(
        models.NotificationRead.user_id == user_id,
        models.NotificationRead.notif_id.like("geofence-%")
    ).all()

    for entry in geofence_entries:
        try:
            # notif_id looks like "geofence-<donation_id>-to-<charity_id>"
            parts = entry.notif_id.split("-")
            donation_id = parts[1] if len(parts) >= 4 else None

            # Fetch related donation
            donation = db.query(models.Donation).filter_by(id=int(donation_id)).first() if donation_id and donation_id.isdigit() else None
            if not donation:
                continue

            bakery = db.query(models.User).filter_by(id=donation.bakery_id).first()
            charity = db.query(models.User).filter_by(id=int(parts[-1])).first() if len(parts) >= 4 else None

            # Calculate distance
            distance_km = None
            if bakery and charity and bakery.latitude and bakery.longitude and charity.latitude and charity.longitude:
                distance_km = round(haversine(
                    bakery.latitude, bakery.longitude,
                    charity.latitude, charity.longitude
                ), 1)

            # ✅ Keep notif_id for DB, add numeric id for frontend highlight
            geofence_notifs.append({
                "id": int(donation.id),  # for frontend zoom
                "notif_id": entry.notif_id,  # for backend tracking
                "type": "geofence",
                "name": donation.name,
                "quantity": donation.quantity,
                "expiration_date": donation.expiration_date.isoformat(),
                "bakery_name": bakery.name if bakery else "Unknown bakery",
                "bakery_profile_picture": bakery.profile_picture if bakery else None,
                "read": entry.read_at is not None,
                "distance_km": distance_km
            })

        except Exception as e:
            print("[Geofence] Parse error:", e)
            continue

    # System Notifications (Admin announcements)
    system_notifications = []
    
    # Get all system notifications for this user
    receipts = db.query(admin_models.NotificationReceipt).filter(
        admin_models.NotificationReceipt.user_id == user_id,
        admin_models.NotificationReceipt.is_read == False
    ).all()
    
    for receipt in receipts:
        notif = receipt.notification
        
        # Skip expired notifications
        if notif.expires_at and notif.expires_at < datetime.utcnow():
            continue
            
        system_notifications.append({
            "id": f"system-{notif.id}",
            "type": "system_notification",
            "title": notif.title,
            "message": notif.message,
            "notification_type": notif.notification_type,
            "priority": notif.priority,
            "sent_at": notif.sent_at.isoformat() if notif.sent_at else None,
            "read": receipt.is_read
        })

    return {
        "messages": latest_messages,
        "donations": donations,
        "received_donations": received_donations,
        "geofence_notifications": geofence_notifs,
        "system_notifications": system_notifications
    }


# Geofence Helper
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat/2)**2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
    )
    distance = 2 * R * math.asin(math.sqrt(a))
    
    # Debug print
    print(f"[Distance] Bakery ({lat1},{lon1}) → Charity ({lat2},{lon2}) = {distance:.2f} km")
    
    return distance

@router.post("/notifications/geofence/run")
def run_geofence_notifications(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    target_date = today + timedelta(days=2)

    # Donations expiring in exactly 2 days
    expiring = (
        db.query(Donation)
        .filter(Donation.expiration_date == target_date)
        .all()
    )

    for donation in expiring:
        # Skip if already linked to a pending/accepted request
        active_req = (
            db.query(DonationRequest)
            .filter(
                DonationRequest.donation_id == donation.id,
                DonationRequest.status.in_(["pending", "accepted"])
            )
            .first()
        )
        if active_req:
            continue

        # Get bakery info
        bakery = db.query(User).filter(User.id == donation.bakery_id).first()
        if not bakery or not (bakery.latitude and bakery.longitude):
            continue

        # Iterate all charities
        charities = db.query(User).filter(User.role == "Charity").all()
        for charity in charities:
            if not (charity.latitude and charity.longitude):
                continue

            distance = haversine(
                bakery.latitude, bakery.longitude,
                charity.latitude, charity.longitude
            )

            if distance <= (charity.notification_radius_km or 10):
                notif_id = f"geofence-{donation.id}-to-{charity.id}"

                # Avoid duplicates
                exists = (
                    db.query(models.NotificationRead)
                    .filter_by(user_id=charity.id, notif_id=notif_id)
                    .first()
                )
                if exists:
                    continue

                # Save persistent notification
                db.add(models.NotificationRead(
                    user_id=charity.id,
                    notif_id=notif_id,
                    read_at=None
                ))

    db.commit()
    return {"status": "geofence notifications scheduled"}
    
def process_geofence_notifications(db: Session, bakery_id: int):
    now = datetime.utcnow()
    today = now.date()
    one_day_from_now = today + timedelta(days=1)
    two_days_from_now = today + timedelta(days=2)

    notif_times = [time(9, 0), time(12, 0), time(15, 0)]

    print(f"[Geofence] Running for bakery {bakery_id} at {now}")

    # Donations expiring in 1 or 2 days
    expiring = (
        db.query(Donation)
        .filter(
            Donation.bakery_id == bakery_id,
            Donation.expiration_date.in_([one_day_from_now, two_days_from_now]),
            Donation.quantity > 0
        )
        .all()
    )
    print(f"[Geofence] Found {len(expiring)} expiring donations")

    bakery = db.query(User).filter(User.id == bakery_id).first()
    if not bakery or not (bakery.latitude and bakery.longitude):
        print(f"[Geofence] ❌ Bakery {bakery_id} missing coords")
        return

    charities = db.query(User).filter(User.role == "Charity").all()
    print(f"[Geofence] Checking {len(charities)} charities for notifications")

    for donation in expiring:
        print(f"\n[Geofence] Donation {donation.id} - {donation.name} exp {donation.expiration_date}")

        # Skip if accepted/pending
        active_req = (
            db.query(DonationRequest)
            .filter(
                DonationRequest.donation_id == donation.id,
                DonationRequest.status.in_(["accepted"])
            )
            .first()
        )
        if active_req:
            print(f"  ⚠️ Donation {donation.id} is {active_req.status}, deleting notifications")
            db.query(NotificationRead).filter(
                NotificationRead.notif_id.like(f"geofence-{donation.id}-%")
            ).delete(synchronize_session=False)
            db.commit()
            continue

        for charity in charities:
            if not (charity.latitude and charity.longitude):
                print(f"  ⚠️ Charity {charity.id} missing coords → skipped")
                continue

            distance = haversine(bakery.latitude, bakery.longitude, charity.latitude, charity.longitude)

            # --- Wave logic ---
            if donation.expiration_date == two_days_from_now:
                # First wave → 5 km
                if distance > 5:
                    print(f"   ❌ Charity {charity.id} outside/not 5km (first wave)")
                    continue

            elif donation.expiration_date == one_day_from_now:
                # Second wave → 10 km, remove old 10km notifications first
                db.query(NotificationRead).filter(
                    NotificationRead.notif_id == f"geofence-{donation.id}-to-{charity.id}"
                ).delete()
                if distance > 10:
                    print(f"   ❌ Charity {charity.id} outside/not 10km (second wave)")
                    continue
                else:
                    print(f"   🗑 Removed old 2-day notif for donation {donation.id} → Charity {charity.id}")

            notif_id = f"geofence-{donation.id}-to-{charity.id}"
            notif = db.query(NotificationRead).filter_by(user_id=charity.id, notif_id=notif_id).first()

            if not notif:
                db.add(NotificationRead(user_id=charity.id, notif_id=notif_id, read_at=None))
                print(f"   💾 Created notification {notif_id}")
            else:
                # Scheduled re-notif logic
                for t in notif_times:
                    notif_time_today = datetime.combine(today, t)
                    if now >= notif_time_today:
                        if notif.read_at:
                            notif.read_at = None
                            db.add(notif)
                            print(f"   🔄 Reset read status for {notif_id} at {now.time()} (after {t})")
                        else:
                            print(f"   ⏸ Already unread {notif_id}, no duplicate")
                        break

    db.commit()
    print("[Geofence] ✅ Finished geofence notifications")