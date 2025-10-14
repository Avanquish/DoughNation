from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app import models, database
from datetime import datetime
from app.chat_manager import manager

import base64, os, json
from uuid import uuid4

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.websocket("/ws/messages/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(int(user_id), websocket)
    db = database.SessionLocal()
    print(f"[WS] User {user_id} connected")

    try:
        # Send active chats immediately
        await send_active_chats(db, int(user_id), websocket)

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            # Send message 
            if msg_type == "message":
                receiver_id = int(data.get("receiver_id"))
                content = data.get("content")
                media = data.get("media")          # base64 string
                media_type = data.get("media_type")  # "image/png" or "video/mp4"
                file_url = None
                is_card = False

                # Check if content is a donation card
                try:
                    parsed_content = json.loads(content)
                    if parsed_content.get("type") == "donation_card":
                        is_card = True
                except:
                    pass  # plain text message

                # Require at least one of them
                if receiver_id and (content or media):
                    # Handle media if exists
                    if media:
                        import base64, os
                        from uuid import uuid4

                        UPLOAD_DIR = "uploads"
                        os.makedirs(UPLOAD_DIR, exist_ok=True)

                        ext = "mp4" if "video" in media_type else "png"  # adjust jpg/jpeg if needed
                        filename = f"{uuid4().hex}.{ext}"
                        path = os.path.join(UPLOAD_DIR, filename)
                        with open(path, "wb") as f:
                            f.write(base64.b64decode(media))
                        file_url = f"/uploads/{filename}"

                    # Save message in DB
                    new_msg = models.Message(
                        sender_id=int(user_id),
                        receiver_id=receiver_id,
                        content=content,
                        image=file_url if media and "image" in media_type else None,
                        video=file_url if media and "video" in media_type else None,
                        timestamp=datetime.utcnow(),
                        is_card=is_card,
                        is_read=False
                    )
                    db.add(new_msg)
                    db.commit()
                    db.refresh(new_msg)

                    payload = {
                        "type": "message",
                        "id": int(new_msg.id),
                        "sender_id": new_msg.sender_id,
                        "receiver_id": new_msg.receiver_id,
                        "content": new_msg.content,
                        "image": new_msg.image,
                        "video": new_msg.video,
                        "timestamp": new_msg.timestamp.isoformat(),
                        "is_read": new_msg.is_read,
                        "is_card": new_msg.is_card,
                    }
                    # Send to both sender & receiver
                    await manager.send_personal_message(payload, new_msg.receiver_id)
                    await manager.send_personal_message(payload, new_msg.sender_id)


                    # Update active chats
                    for uid in [new_msg.sender_id, new_msg.receiver_id]:
                        await manager.send_personal_message(
                            {
                                "type": "active_chats_update",
                                "chat": build_chat_summary(db, new_msg, uid),
                            },
                            uid
                        )

            # Delete message
            elif msg_type == "delete_message":
                msg_id = int(data.get("id"))
                msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
                if msg:
                    # Optional: only allow sender to delete
                    if msg.sender_id == user_id:
                        db.delete(msg)
                        db.commit()
                    # Notify both sender and receiver to remove from frontend
                    payload = {"type": "delete_message", "id": msg_id}
                    await manager.send_personal_message(payload, msg.sender_id)
                    await manager.send_personal_message(payload, msg.receiver_id)

            elif msg_type == "delete_for_me":
                msg_id = int(data.get("id"))
                msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
                if msg:
                    if msg.sender_id == user_id:
                        msg.deleted_for_sender = True
                    elif msg.receiver_id == user_id:
                        msg.deleted_for_receiver = True
                    db.commit()
                    await manager.send_personal_message({"type": "delete_for_me", "id": msg_id}, user_id)

            elif msg_type == "accept_donation":
                msg_id = int(data.get("id"))
                msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
                if msg and msg.is_card:
                    msg.accepted_by_receiver = True
                    db.commit()

                # Notify both users
                payload = {"type": "donation_accepted", "id": msg.id}
                await manager.send_personal_message(payload, msg.sender_id)
                await manager.send_personal_message(payload, msg.receiver_id)


            # Typing 
            elif msg_type in ["typing", "stop_typing"]:
                receiver_id = int(data.get("receiver_id"))
                if receiver_id:
                    await manager.send_personal_message(
                        {"type": msg_type, "sender_id": int(user_id)},
                        receiver_id
                    )

            # Get history
            elif msg_type == "get_history":
                peer_id = int(data.get("peer_id"))
                msgs = db.query(models.Message).filter(
                    or_(
                        and_(models.Message.sender_id == int(user_id), models.Message.receiver_id == peer_id),
                        and_(models.Message.sender_id == peer_id, models.Message.receiver_id == int(user_id))
                    )
                ).order_by(models.Message.timestamp).all()

                history = []
                for m in msgs:
                    # Skip if this user deleted the message
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

                # Mark unread messages as read
                unread = db.query(models.Message).filter(
                    models.Message.receiver_id == int(user_id),
                    models.Message.sender_id == peer_id,
                    models.Message.is_read == False
                ).all()
                for u in unread:
                    u.is_read = True
                if unread:
                    db.commit()
                    await manager.send_personal_message(
                        {"type": "message_read", "reader_id": int(user_id), "peer_id": peer_id},
                        peer_id
                    )

                await websocket.send_json({"type": "history", "messages": history})

            # Get active chats 
            elif msg_type == "get_active_chats":
                await send_active_chats(db, int(user_id), websocket)

            # Search charities and bakeries
            elif msg_type == "search":
                query = (data.get("query") or "").strip().lower()
                target = data.get("target")

                q = db.query(models.User).filter(
                    models.User.verified == True,
                    models.User.role != "Admin",   # exclude admin
                    models.User.id != user_id,  # exclude self
                    func.lower(models.User.name).like(f"%{query}%")
                )

                if target == "charities":
                    q = q.filter(models.User.role == "Charity")
                elif target == "bakeries":
                    q = q.filter(models.User.role == "Bakery")
                elif target in ["users", "all"]:
                    pass  # keep both charities + bakeries

                results = q.all()

                payload = [
                    {
                        "id": u.id,
                        "name": f"{u.name} ({u.role})" if u.role in ["Bakery", "Charity"] else u.name, #if dont include the role just "name": u.name,
                        "email": u.email,
                        "profile_picture": u.profile_picture,
                        "role": u.role
                    }
                    for u in results
                ]
                await websocket.send_json({"type": "search_results", "results": payload})


    except WebSocketDisconnect:
        manager.disconnect(int(user_id), websocket)
        print(f"[WS] User {user_id} disconnected")
    finally:
        db.close()


#  Helper functions 
def get_user_dict(db: Session, user_id: int):
    u = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not u:
        return None
    return {
        "id": u.id, 
        "name": f"{u.name} ({u.role})" if u.role in ["Bakery", "Charity"] else u.name, #if dont include the role just "name": u.name,
        "email": u.email, 
        "profile_picture": u.profile_picture, 
        "role": u.role}


def build_chat_summary(db: Session, message_obj, client_user_id: int):
    peer_id = message_obj.receiver_id if message_obj.sender_id == client_user_id else message_obj.sender_id
    peer = get_user_dict(db, peer_id)
    return {
        "peer": peer,
        "last_message": {
            "id": message_obj.id,
            "sender_id": message_obj.sender_id,
            "receiver_id": message_obj.receiver_id,
            "content": message_obj.content,
            "timestamp": message_obj.timestamp.isoformat(),
            "is_read": message_obj.is_read
        },
        "unread": db.query(models.Message).filter(
            models.Message.receiver_id == client_user_id,
            models.Message.sender_id == peer_id,
            models.Message.is_read == False
        ).count()
    }


async def send_active_chats(db: Session, user_id: int, websocket: WebSocket):
    msgs = db.query(models.Message).filter(
        or_(models.Message.sender_id == user_id, models.Message.receiver_id == user_id)
    ).order_by(models.Message.timestamp.desc()).all()

    seen = {}
    chats = []
    for m in msgs:
        peer_id = m.receiver_id if m.sender_id == user_id else m.sender_id
        if peer_id in seen: continue
        seen[peer_id] = True
        peer = get_user_dict(db, peer_id)
        unread_count = db.query(models.Message).filter(
            models.Message.receiver_id == user_id,
            models.Message.sender_id == peer_id,
            models.Message.is_read == False
        ).count()
        chats.append({
            "peer": peer,
            "last_message": {
                "id": m.id,
                "sender_id": m.sender_id,
                "receiver_id": m.receiver_id,
                "content": (
                        m.content if m.content 
                        else "Send Image" if m.image 
                        else "Send Video" if m.video 
                        else ""
                 ),
                "image": m.image,     
                "video": m.video, 
                "timestamp": m.timestamp.isoformat(),
                "is_card": getattr(m, "is_card", False),
                "is_read": m.is_read
            },
            "unread": unread_count
        })

    await websocket.send_json({"type": "active_chats", "chats": chats})