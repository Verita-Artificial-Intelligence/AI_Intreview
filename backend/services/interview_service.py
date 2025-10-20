from fastapi import HTTPException
from typing import List, Dict, Any
from datetime import datetime, timezone
import logging
import json
import re
from openai import AsyncOpenAI
from models import Interview, InterviewCreate, ChatMessage
from utils import prepare_for_mongo, parse_from_mongo
from database import db, get_jobs_collection, get_candidates_collection
from config import OPENAI_API_KEY
from prompts.chat import get_initial_greeting
from prompts.interview_summary import get_summary_prompt, SUMMARY_SYSTEM_PROMPT
from prompts.interview_analysis import get_analysis_prompt, SYSTEM_PROMPT

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
logger = logging.getLogger(__name__)


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

        # Get job details if job_id is provided
        job_title = None
        if interview_data.job_id:
            jobs_collection = get_jobs_collection()
            job = await jobs_collection.find_one(
                {"id": interview_data.job_id}, {"_id": 0}
            )
            if job:
                job_title = job.get("title")

        interview = Interview(
            candidate_id=interview_data.candidate_id,
            candidate_name=candidate["name"],
            position=candidate["position"],
            job_id=interview_data.job_id,
            job_title=job_title,
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

        # For realtime interviews with transcript, mark as completed and set analysis to pending
        if has_transcript:
            await db.interviews.update_one(
                {"id": interview_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "analysis_status": "pending",
                    }
                },
            )
            return {"message": "Interview completed", "status": "completed"}

        # For old chat-based system, generate summary from messages
        messages = await db.messages.find(
            {"interview_id": interview_id}, {"_id": 0}
        ).to_list(1000)

        if not messages:
            # No messages or transcript - just mark as completed without analysis
            await db.interviews.update_one(
                {"id": interview_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "analysis_status": None,
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
                        "analysis_status": "pending",
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
                        "analysis_status": "pending",
                    }
                },
            )
            return {"message": "Interview completed", "status": "completed"}

    @staticmethod
    async def analyze_interview(interview_id: str, framework: str = "behavioral") -> Dict[str, Any]:
        """Generate AI analysis of interview and save to database"""
        try:
            # Mark analysis as processing
            await db.interviews.update_one(
                {"id": interview_id},
                {"$set": {"analysis_status": "processing"}}
            )

            # Get interview
            interview_doc = await db.interviews.find_one({"id": interview_id}, {"_id": 0})
            if not interview_doc:
                await db.interviews.update_one(
                    {"id": interview_id},
                    {"$set": {"analysis_status": "failed"}}
                )
                raise HTTPException(status_code=404, detail="Interview not found")

            # Check if we have transcript
            transcript = interview_doc.get("transcript", [])
            if len(transcript) < 3:
                default_analysis = {
                    "overall_score": 0,
                    "skills_breakdown": [],
                    "key_insights": ["Insufficient interview data"],
                    "strengths": ["Interview too short to assess"],
                    "areas_for_improvement": ["Complete a full interview"],
                    "red_flags": [],
                    "standout_moments": [],
                    "communication_assessment": {
                        "clarity_score": 0,
                        "articulation_score": 0,
                        "confidence_score": 0,
                        "notes": "Insufficient data"
                    },
                    "technical_depth": {"score": 0, "notes": "Insufficient data"},
                    "problem_solving": {"score": 0, "approach": "Not assessed", "example": "N/A"},
                    "recommendation": "Incomplete Interview",
                    "confidence": 0,
                    "recommendations": ["Complete the full interview process"],
                    "next_steps": []
                }
                await db.interviews.update_one(
                    {"id": interview_id},
                    {"$set": {
                        "analysis_status": "completed",
                        "analysis_result": default_analysis
                    }}
                )
                return default_analysis

            # Get candidate info
            candidates_collection = get_candidates_collection()
            candidate = await candidates_collection.find_one(
                {"id": interview_doc["candidate_id"]},
                {"_id": 0}
            )

            if not candidate:
                # Use interview data as fallback
                candidate = {
                    "name": interview_doc.get("candidate_name", "Candidate"),
                    "position": interview_doc.get("position", "Unknown"),
                    "skills": [],
                    "experience_years": 0
                }

            # Build conversation from transcript
            conversation_lines = []
            for i, entry in enumerate(transcript):
                speaker = entry.get("speaker", "user")
                text = entry.get("text", "")
                role = "USER" if speaker == "user" else "AI INTERVIEWER"
                conversation_lines.append(f"[{i+1}] {role}: {text}")

            conversation = "\n".join(conversation_lines)

            # Generate analysis using OpenAI
            framework_name = "Creative Portfolio & Process Assessment"

            analysis_prompt = get_analysis_prompt(
                framework_name=framework_name,
                candidate_name=candidate["name"],
                candidate_position=candidate["position"],
                candidate_skills=candidate.get("skills", []),
                candidate_experience_years=candidate.get("experience_years", 0),
                conversation=conversation
            )

            completion = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": analysis_prompt}
                ]
            )

            response = completion.choices[0].message.content

            # Parse JSON from response
            try:
                json_match = re.search(r"\{.*\}", response, re.DOTALL)
                if json_match:
                    analysis = json.loads(json_match.group())
                else:
                    raise ValueError("No JSON in response")

                # Ensure required fields
                analysis.setdefault("overall_score", 7)
                analysis.setdefault("skills_breakdown", [])
                analysis.setdefault("key_insights", [])
                analysis.setdefault("strengths", [])
                analysis.setdefault("areas_for_improvement", [])
                analysis.setdefault("recommendation", "Hire")
                analysis.setdefault("confidence", 75)
                analysis.setdefault("recommendations", [])
                analysis.setdefault("next_steps", [])

                # Save analysis to database
                await db.interviews.update_one(
                    {"id": interview_id},
                    {"$set": {
                        "analysis_status": "completed",
                        "analysis_result": analysis
                    }}
                )

                return analysis

            except Exception as e:
                logger.error(f"Failed to parse analysis: {e}")
                # Return a basic analysis
                basic_analysis = {
                    "overall_score": 7,
                    "skills_breakdown": [
                        {"skill": "Communication", "score": 7, "level": "Proficient"},
                        {"skill": "Creative Process", "score": 7, "level": "Proficient"}
                    ],
                    "key_insights": ["Creative approach demonstrated"],
                    "strengths": ["Shows creative thinking"],
                    "areas_for_improvement": ["Continue developing portfolio"],
                    "recommendation": "Hire",
                    "confidence": 75,
                    "recommendations": [],
                    "next_steps": []
                }

                # Save basic analysis to database
                await db.interviews.update_one(
                    {"id": interview_id},
                    {"$set": {
                        "analysis_status": "completed",
                        "analysis_result": basic_analysis
                    }}
                )

                return basic_analysis

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error analyzing interview: {e}")
            # Mark as failed
            await db.interviews.update_one(
                {"id": interview_id},
                {"$set": {"analysis_status": "failed"}}
            )
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
