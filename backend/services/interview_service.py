from fastapi import HTTPException
from typing import List
from datetime import datetime, timezone
import logging
from openai import AsyncOpenAI
from models import Interview, InterviewCreate, ChatMessage
from utils import prepare_for_mongo, parse_from_mongo
from database import db
from config import OPENAI_API_KEY
from prompts.chat import get_initial_greeting
from prompts.interview_summary import get_summary_prompt, SUMMARY_SYSTEM_PROMPT

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)


class InterviewService:
    @staticmethod
    async def create_interview(interview_data: InterviewCreate) -> Interview:
        """Create a new interview and initialize with greeting message"""
        # Get candidate
        candidate = await db.candidates.find_one(
            {"id": interview_data.candidate_id}, {"_id": 0}
        )
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        interview = Interview(
            candidate_id=interview_data.candidate_id,
            candidate_name=candidate["name"],
            position=candidate["position"],
            status="in_progress",
        )

        doc = prepare_for_mongo(interview.model_dump())
        await db.interviews.insert_one(doc)

        # Create initial AI message
        system_msg = ChatMessage(
            interview_id=interview.id,
            role="assistant",
            content=get_initial_greeting(candidate["position"]),
        )
        msg_doc = prepare_for_mongo(system_msg.model_dump())
        await db.messages.insert_one(msg_doc)

        return interview

    @staticmethod
    async def get_interviews() -> List[Interview]:
        """Get all interviews sorted by creation date"""
        interviews = (
            await db.interviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        )
        return [Interview(**parse_from_mongo(i)) for i in interviews]

    @staticmethod
    async def get_interview(interview_id: str) -> Interview:
        """Get a specific interview by ID"""
        interview = await db.interviews.find_one({"id": interview_id}, {"_id": 0})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        return Interview(**parse_from_mongo(interview))

    @staticmethod
    async def complete_interview(interview_id: str):
        """Mark interview as completed and optionally generate summary"""
        interview = await db.interviews.find_one({"id": interview_id})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Check if interview has a transcript (new realtime system)
        has_transcript = "transcript" in interview and interview["transcript"]

        # For realtime interviews with transcript, just mark as completed
        if has_transcript:
            await db.interviews.update_one(
                {"id": interview_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
            return {"message": "Interview completed", "status": "completed"}

        # For old chat-based system, generate summary from messages
        messages = await db.messages.find(
            {"interview_id": interview_id}, {"_id": 0}
        ).to_list(1000)

        if not messages:
            # No messages or transcript - just mark as completed
            await db.interviews.update_one(
                {"id": interview_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
            return {"message": "Interview completed", "status": "completed"}

        # Generate summary using AI for chat-based interviews
        try:
            conversation = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
            summary_prompt = get_summary_prompt(conversation)

            completion = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": summary_prompt},
                ],
            )

            summary = completion.choices[0].message.content

            # Update interview
            await db.interviews.update_one(
                {"id": interview_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "summary": summary,
                    }
                },
            )

            return {"message": "Interview completed", "summary": summary, "status": "completed"}

        except Exception as e:
            logging.error(f"Summary generation error: {str(e)}")
            # Complete without summary if AI fails
            await db.interviews.update_one(
                {"id": interview_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
            return {"message": "Interview completed", "status": "completed"}
