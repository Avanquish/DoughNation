from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request, Form, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, not_
from app import models, database
from datetime import datetime
from typing import Optional, List
import base64, os, json
from uuid import uuid4

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Dependency to get DB session
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper to decode JWT payload (best-effort, no signature verification)
def _decode_jwt_payload(token: str):
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return {}
        b = parts[1]
        # add padding
        b += "=" * (-len(b) % 4)
        decoded = base64.urlsafe_b64decode(b.encode())
        return json.loads(decoded.decode())
    except Exception:
        return {}

# Dependency: get current user from Authorization Bearer token
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.split(" ")[1] if " " in authorization else authorization
    payload = _decode_jwt_payload(token)
    try:
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# --- Send a message (accepts JSON or multipart/form-data) ---
@router.post("/messages/send")
async def send_message(request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Accepts either:
      - application/json: { receiver_id, content }
      - multipart/form-data with fields receiver_id, content and file (UploadFile)
    Saves file to UPLOAD_DIR and creates message row.
    """
    content_type = (request.headers.get("content-type") or "").lower()
    receiver_id = None
    content = None
    file_url = None
    is_card = False

    # multipart/form-data
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        receiver_id = int(form.get("receiver_id"))
        content = form.get("content")
        file_obj = form.get("file")
        if file_obj:
            # file_obj is UploadFile
            filename = f"{uuid4().hex}_{file_obj.filename}"
            path = os.path.join(UPLOAD_DIR, filename)
            with open(path, "wb") as f:
                f.write(await file_obj.read())
            # store relative path (leading slash optional)
            file_url = f"/{UPLOAD_DIR}/{filename}"
            ct = getattr(file_obj, "content_type", "") or ""
            image_field = "image" if "image" in ct else None
            video_field = "video" if "video" in ct else None
    else:
        # assume JSON
        body = await request.json()
        receiver_id = int(body.get("receiver_id"))
        content = body.get("content")
        # frontend does not send base64 media in JSON (files sent via multipart),
        # but if provided as 'media' + 'media_type' (base64) it will be handled:
        media_b64 = body.get("media")
        media_type = body.get("media_type")
        if media_b64:
            ext = "mp4" if media_type and "video" in media_type else "png"
            filename = f"{uuid4().hex}.{ext}"
            path = os.path.join(UPLOAD_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(media_b64))
            file_url = f"/{UPLOAD_DIR}/{filename}"
            image_field = "image" if media_type and "image" in media_type else None
            video_field = "video" if media_type and "video" in media_type else None
        else:
            image_field = None
            video_field = None

    if not receiver_id or not (content or file_url):
        raise HTTPException(status_code=400, detail="Message must have receiver_id and content or a file")

    # detect donation card
    try:
        parsed_content = json.loads(content) if isinstance(content, str) else {}
        if parsed_content.get("type") == "donation_card":
            is_card = True
    except Exception:
        is_card = False

    new_msg = models.Message(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        content=content,
        image=file_url if file_url and image_field else None,
        video=file_url if file_url and video_field else None,
        timestamp=datetime.utcnow(),
        is_card=is_card,
        is_read=False
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    return {"status": "ok", "message": {
        "id": new_msg.id,
        "sender_id": new_msg.sender_id,
        "receiver_id": new_msg.receiver_id,
        "content": new_msg.content,
        "image": new_msg.image,
        "video": new_msg.video,
        "timestamp": new_msg.timestamp.isoformat(),
        "is_read": new_msg.is_read,
        "is_card": new_msg.is_card
    }}


# --- Delete message (accepts JSON or form) ---
@router.post("/messages/delete")
async def delete_message(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    content_type = (request.headers.get("content-type") or "").lower()
    if content_type.startswith("application/json"):
        data = await request.json()
    else:
        data = await request.form()

    # accept either 'id' or 'message_id'
    message_id = data.get("id") or data.get("message_id")
    if message_id is None:
        raise HTTPException(status_code=400, detail="message id required")
    try:
        message_id = int(message_id)
    except:
        raise HTTPException(status_code=400, detail="invalid message id")

    # for_all vs for_me_only / for_all
    for_all = data.get("for_all")
    if isinstance(for_all, str):
        for_all = for_all.lower() in ("1", "true", "yes")
    elif for_all is None:
        # legacy name
        for_all = not (str(data.get("for_me_only") or "").lower() in ("1", "true", "yes"))

    msg = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if not for_all:
        # delete for me only
        if msg.sender_id == current_user.id:
            msg.deleted_for_sender = True
        elif msg.receiver_id == current_user.id:
            msg.deleted_for_receiver = True
        else:
            raise HTTPException(status_code=403, detail="Cannot delete this message")
    else:
        # delete for everyone
        allow_delete_for_all = False

        # sender can always delete
        if msg.sender_id == current_user.id:
            allow_delete_for_all = True
        else:
            # check if it's a donation card and current user is Bakery
            try:
                parsed_content = json.loads(msg.content)
            except Exception:
                parsed_content = {}

            is_donation_card = parsed_content.get("type") == "donation_card"
            donation_info = parsed_content.get("donation") or {}

            # only allow if Bakery user owns this donation
            if current_user.role == "Bakery" and is_donation_card:
                if donation_info.get("bakery_id") == current_user.id:
                    allow_delete_for_all = True

        if allow_delete_for_all:
            db.delete(msg)
        else:
            raise HTTPException(status_code=403, detail="Cannot delete this message for everyone")

    db.commit()
    return {"status": "ok", "id": message_id}

# --- Accept donation (use current user) ---
@router.post("/messages/accept_donation")
async def accept_donation(message_id: int = Form(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    msg = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not msg or not getattr(msg, "is_card", False):
        raise HTTPException(status_code=404, detail="Donation card not found")

    # mark accepted by receiver
    msg.accepted_by_receiver = True
    db.commit()
    return {"status": "ok", "id": message_id}


# --- Fetch history with polling ---
@router.get("/messages/history")
def get_history(peer_id: int = Query(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    msgs = db.query(models.Message).filter(
        or_(
            and_(models.Message.sender_id == user_id, models.Message.receiver_id == peer_id),
            and_(models.Message.sender_id == peer_id, models.Message.receiver_id == user_id)
        )
    ).order_by(models.Message.timestamp).all()

    history = []
    for m in msgs:
        if (m.sender_id == user_id and getattr(m, "deleted_for_sender", False)) or \
           (m.receiver_id == user_id and getattr(m, "deleted_for_receiver", False)):
            continue
        history.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "content": m.content,
            "image": m.image,
            "video": m.video,
            "timestamp": m.timestamp.isoformat(),
            "is_card": getattr(m, "is_card", False),
            "accepted": getattr(m, "accepted_by_receiver", False),
            "is_read": m.is_read
        })

    # Mark unread as read
    unread = db.query(models.Message).filter(
        models.Message.receiver_id == user_id,
        models.Message.sender_id == peer_id,
        models.Message.is_read == False
    ).all()
    for u in unread:
        u.is_read = True
    if unread:
        db.commit()

    return {"status": "ok", "messages": history}

# --- Active chats ---
@router.get("/messages/active_chats")
def get_active_chats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id

    # messages involving the user but ignore messages deleted for this user
    msgs = (
        db.query(models.Message)
        .filter(or_(models.Message.sender_id == user_id, models.Message.receiver_id == user_id))
        .filter(
            not_(
                or_(
                    and_(models.Message.sender_id == user_id, models.Message.deleted_for_sender == True),
                    and_(models.Message.receiver_id == user_id, models.Message.deleted_for_receiver == True),
                )
            )
        )
        .order_by(models.Message.timestamp.desc())
        .all()
    )

    seen = set()
    chats = []
    notif_types = ("confirmed_donation", "donation_unavailable", "donation_cancelled", "donation_card")

    for m in msgs:
        peer_id = m.receiver_id if m.sender_id == user_id else m.sender_id
        if not peer_id or peer_id in seen:
            continue

        # pick the latest visible message BETWEEN the two users
        last = (
            db.query(models.Message)
            .filter(
                or_(
                    and_(models.Message.sender_id == user_id, models.Message.receiver_id == peer_id),
                    and_(models.Message.sender_id == peer_id, models.Message.receiver_id == user_id),
                )
            )
            .filter(
                not_(
                    or_(
                        and_(models.Message.sender_id == user_id, models.Message.deleted_for_sender == True),
                        and_(models.Message.receiver_id == user_id, models.Message.deleted_for_receiver == True),
                    )
                )
            )
            .order_by(models.Message.timestamp.desc())
            .first()
        )

        if not last:
            continue

        # safe-parse last.content (may be int/string/json/dict)
        parsed = {}
        try:
            if isinstance(last.content, str):
                parsed = json.loads(last.content)
            elif isinstance(last.content, dict):
                parsed = last.content
        except Exception:
            parsed = {}

        # determine if current user is directly involved in the message
        involved = (last.sender_id == user_id or last.receiver_id == user_id)

        # Extra handling for donation_card: some cards include explicit targets
        card_targets = set()
        if isinstance(parsed, dict) and parsed.get("type") == "donation_card":
            for key in ("target_user_id", "bakery_id", "product_owner_id", "receiver_id", "recipient_id", "owner_id"):
                try:
                    v = parsed.get(key)
                    if v is not None and str(v).strip() != "":
                        card_targets.add(int(v))
                except Exception:
                    pass

        # If last is a notification-type and current user is not involved, try to find a non-notification last message
        if isinstance(parsed, dict) and parsed.get("type") in notif_types and not involved:
            if parsed.get("type") == "donation_card":
                # if card has explicit targets and current user is not in them, try to find a normal message
                if card_targets and (user_id not in card_targets):
                    pair_msgs = (
                        db.query(models.Message)
                        .filter(
                            or_(
                                and_(models.Message.sender_id == user_id, models.Message.receiver_id == peer_id),
                                and_(models.Message.sender_id == peer_id, models.Message.receiver_id == user_id),
                            )
                        )
                        .filter(
                            not_(
                                or_(
                                    and_(models.Message.sender_id == user_id, models.Message.deleted_for_sender == True),
                                    and_(models.Message.receiver_id == user_id, models.Message.deleted_for_receiver == True),
                                )
                            )
                        )
                        .order_by(models.Message.timestamp.desc())
                        .limit(200)
                        .all()
                    )
                    found = None
                    for pm in pair_msgs:
                        try:
                            pc = json.loads(pm.content) if isinstance(pm.content, str) else (pm.content if isinstance(pm.content, dict) else {})
                        except Exception:
                            pc = {}
                        if not (isinstance(pc, dict) and pc.get("type") in notif_types):
                            # accept the first non-notification with visible content/media
                            if pm.content or pm.image or pm.video:
                                found = pm
                                break
                    if found:
                        last = found
                        # re-parse last content
                        try:
                            if isinstance(last.content, str):
                                parsed = json.loads(last.content)
                            elif isinstance(last.content, dict):
                                parsed = last.content
                            else:
                                parsed = {}
                        except Exception:
                            parsed = {}
                    else:
                        # no relevant last message for this pair -> skip peer
                        continue
                else:
                    # no explicit card_targets (broadcast-like card) -> skip for unrelated user
                    continue
            else:
                # other notification types (confirmed_donation, etc.) - skip if not involved
                continue

        # REQUIRE last to have visible content or media. If it doesn't, skip the peer.
        if not (last.content or last.image or last.video):
            continue

        # compute display_snippet and display_timestamp for this user (friendly labels)
        display_snippet = None
        display_timestamp = last.timestamp.isoformat()
        try:
            if isinstance(parsed, dict) and parsed.get("type") in notif_types:
                # show donation notification only to involved users (or explicit targets handled above)
                if parsed.get("type") == "donation_card":
                    display_snippet = "Donation Request"
                elif parsed.get("type") == "confirmed_donation":
                    display_snippet = "Donation Request Confirmed"
                else:
                    display_snippet = parsed.get("message") or parsed.get("text") or (last.content if isinstance(last.content, str) else None)
            else:
                # normal message / prefer readable field if JSON object
                if last.content:
                    if isinstance(parsed, dict):
                        display_snippet = parsed.get("message") or parsed.get("text") or str(last.content)
                    else:
                        display_snippet = str(last.content)
                elif last.image:
                    display_snippet = "Send Image"
                elif last.video:
                    display_snippet = "Send Video"
        except Exception:
            display_snippet = (last.content if last.content else None)

        # load peer user record
        peer = db.query(models.User).filter(models.User.id == peer_id).first()
        if not peer:
            continue

        # unread count (exclude messages deleted for this user)
        unread_q = (
            db.query(models.Message)
            .filter(
                models.Message.receiver_id == user_id,
                models.Message.sender_id == peer_id,
                models.Message.is_read == False
            )
            .filter(
                not_(
                    or_(
                        and_(models.Message.sender_id == user_id, models.Message.deleted_for_sender == True),
                        and_(models.Message.receiver_id == user_id, models.Message.deleted_for_receiver == True),
                    )
                )
            )
        )
        try:
            unread_count = unread_q.count()
        except Exception:
            unread_count = 0

        seen.add(peer_id)

        chats.append({
            "peer": {
                "id": peer.id,
                "name": f"{peer.name} ({peer.role})" if peer.role in ["Bakery", "Charity"] else peer.name,
                "email": peer.email,
                "profile_picture": peer.profile_picture,
                "role": peer.role
            },
            "last_message": {
                "id": last.id,
                "sender_id": last.sender_id,
                "receiver_id": last.receiver_id,
                "content": last.content or ("Send Image" if last.image else "Send Video" if last.video else ""),
                "image": last.image,
                "video": last.video,
                "timestamp": last.timestamp.isoformat(),
                "is_card": getattr(last, "is_card", False),
                "is_read": last.is_read
            },
            "display_snippet": display_snippet,
            "display_timestamp": display_timestamp,
            "unread": unread_count
        })

    # sort chats by display_timestamp desc (most recent visible conversation first)
    try:
        chats.sort(key=lambda c: c.get("display_timestamp") or c["last_message"]["timestamp"], reverse=True)
    except Exception:
        pass

    return {"status": "ok", "chats": chats}

# --- Search users ---
def _normalize_name(u):
    return f"{u.name} ({u.role})" if u.role in ["Bakery", "Charity"] else u.name

@router.get("/users/search")
def search_users(
    query: str = Query(..., alias="q"),
    target: str = Query("all"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_id = current_user.id
    q = db.query(models.User).filter(
        models.User.verified == True,
        models.User.role != "Admin",
        models.User.id != user_id,
        func.lower(models.User.name).like(f"%{query.lower()}%")
    )

    if target == "charities":
        q = q.filter(models.User.role == "Charity")
    elif target == "bakeries":
        q = q.filter(models.User.role == "Bakery")

    results = q.all()
    payload = [
        {
            "id": u.id,
            "name": _normalize_name(u),
            "email": u.email,
            "profile_picture": u.profile_picture,
            "role": u.role
        } for u in results
    ]
    return {"status": "ok", "results": payload}
