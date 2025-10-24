from fastapi import HTTPException
from typing import List
import logging
from openai import AsyncOpenAI
from models import ChatMessage, ChatRequest
from utils import prepare_for_mongo, parse_from_mongo
from database import db
from config import OPENAI_API_KEY
from prompts.chat import get_interviewer_system_prompt

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)


class ChatService:
    @staticmethod
    async def get_messages(interview_id: str) -> List[ChatMessage]:
        """Get all messages for an interview"""
        messages = (
            await db.messages.find({"interview_id": interview_id}, {"_id": 0})
            .sort("timestamp", 1)
            .to_list(1000)
        )
        return [ChatMessage(**parse_from_mongo(m)) for m in messages]

    @staticmethod
    async def send_message(chat_req: ChatRequest):
        """Send a message and get AI response"""
        # Verify interview exists
        interview = await db.interviews.find_one({"id": chat_req.interview_id})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Get candidate details
        candidate = await db.candidates.find_one({"id": interview["candidate_id"]})

        # Save user message
        user_msg = ChatMessage(
            interview_id=chat_req.interview_id, role="user", content=chat_req.message
        )
        await db.messages.insert_one(prepare_for_mongo(user_msg.model_dump()))

        # Get conversation history
        history = (
            await db.messages.find({"interview_id": chat_req.interview_id}, {"_id": 0})
            .sort("timestamp", 1)
            .to_list(1000)
        )

        # Create AI response using OpenAI
        try:
            # Use interview-specific instructions to include custom questions, types, etc.
            from services.interview_service import InterviewService
            from models import Interview
            from utils import parse_from_mongo

            interview_obj = Interview(**parse_from_mongo(interview))
            system_message = await InterviewService.get_interview_instructions(interview_obj)

            messages = [{"role": "system", "content": system_message}]

            for msg in history:
                if msg["role"] in ["user", "assistant"]:
                    messages.append({"role": msg["role"], "content": msg["content"]})

            completion = await openai_client.chat.completions.create(
                model="gpt-4o-mini", messages=messages
            )

            ai_response = completion.choices[0].message.content

            # Save AI response
            ai_msg = ChatMessage(
                interview_id=chat_req.interview_id,
                role="assistant",
                content=ai_response,
            )
            await db.messages.insert_one(prepare_for_mongo(ai_msg.model_dump()))

            return {"message": ai_response}

        except Exception as e:
            logging.error(f"AI chat error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
