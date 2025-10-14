# backend/app/routes/test_ws.py
from fastapi import APIRouter, WebSocket

router = APIRouter()

@router.websocket("/ws/test/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await websocket.accept()
    await websocket.send_text(f"Hello {user_id}")
