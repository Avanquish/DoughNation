from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app import models, database
from datetime import datetime
from app.chat_manager import manager

router = APIRouter()

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
                content = (data.get("content") or "").strip()
                receiver_id = int(data.get("receiver_id"))
                if content and receiver_id:
                    new_msg = models.Message(
                        sender_id=int(user_id),
                        receiver_id=receiver_id,
                        content=content,
                        timestamp=datetime.utcnow(),
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
                        "timestamp": new_msg.timestamp.isoformat(),
                        "is_read": new_msg.is_read,
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

                history = [
                    {
                        "id": m.id,
                        "sender_id": m.sender_id,
                        "receiver_id": m.receiver_id,
                        "content": m.content,
                        "timestamp": m.timestamp.isoformat(),
                        "is_read": m.is_read
                    } for m in msgs
                ]

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
                role = "Charity" if target == "charities" else "Bakery"
                results = db.query(models.User).filter(
                    models.User.role == role,
                    models.User.verified == True,
                    func.lower(models.User.name).like(f"%{query}%")
                ).all()
                payload = [{"id": u.id, "name": u.name, "email": u.email, "profile_picture": u.profile_picture} for u in results]
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
    return {"id": u.id, "name": u.name, "email": u.email, "profile_picture": u.profile_picture, "role": u.role}


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
                "content": m.content,
                "timestamp": m.timestamp.isoformat(),
                "is_read": m.is_read
            },
            "unread": unread_count
        })

    await websocket.send_json({"type": "active_chats", "chats": chats})
