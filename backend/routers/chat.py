from fastapi import APIRouter
from typing import List
from models import ChatMessage, ChatRequest
from services import ChatService

router = APIRouter(tags=["Chat"])


@router.get("/interviews/{interview_id}/messages", response_model=List[ChatMessage])
async def get_messages(interview_id: str):
    """Get all messages for an interview"""
    return await ChatService.get_messages(interview_id)


@router.post("/chat")
async def chat(chat_req: ChatRequest):
    """Send a message and get AI response"""
    return await ChatService.send_message(chat_req)
