from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

from tools.chatbot import run_chat

router = APIRouter(prefix="/api/chat", tags=["chatbot"])

class ChatRequest(BaseModel):
    user_id: str
    is_logged_in: bool
    prompt: str
    thread_id: str
    longterm_memory: str = ""

@router.post("/stream")
async def stream_chat(req: ChatRequest):
    return StreamingResponse(
        run_chat(
            user_id=req.user_id,
            is_logged_in=req.is_logged_in,
            prompt=req.prompt,
            thread_id=req.thread_id,
            longterm_memory=req.longterm_memory
        ),
        media_type="text/event-stream"
    )
