from fastapi import HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import logging
import json
import re
from openai import AsyncOpenAI
from models import Interview, InterviewCreate, ChatMessage, SkillDefinition
from utils import prepare_for_mongo, parse_from_mongo
from utils.status_workflows import (
    validate_status_transition,
    get_cascade_entities,
    WorkflowType,
    StatusValidationError,
)
from database import db
from repositories import InterviewRepository, JobRepository, CandidateRepository
from config import OPENAI_API_KEY
from prompts.chat import get_initial_greeting
from prompts.interview_analysis import get_analysis_prompt, SYSTEM_PROMPT
from prompts.interview_types import get_interview_type_config

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
logger = logging.getLogger(__name__)


class InterviewService:
    @staticmethod
    async def summarize_job_description(job_description: str) -> str:
        """
        Generate a concise summary of a job description for use in interview prompts.

        Args:
            job_description: Full job description text

        Returns:
            2-3 sentence summary of key requirements and responsibilities
        """
        if not job_description or len(job_description.strip()) < 50:
            return ""

        try:
            completion = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that summarizes job descriptions concisely.",
                    },
                    {
                        "role": "user",
                        "content": f"""Summarize this job description in 2-3 sentences, focusing on the key requirements, responsibilities, and qualifications needed for the role. Be specific and concise.

Job Description:
{job_description}

Summary:""",
                    },
                ],
            )

            summary = completion.choices[0].message.content.strip()
            return summary

        except Exception as e:
            logger.error(f"Failed to summarize job description: {e}")
            # Return truncated description as fallback
            return job_description[:500] + ("..." if len(job_description) > 500 else "")

    @staticmethod
    async def create_interview(interview_data: InterviewCreate) -> Interview:
        """Create a new interview - inherits configuration from job if job_id is provided"""
        # Get candidate
        candidate = await CandidateRepository.find_by_id(interview_data.candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Prevent duplicate interviews for the same job once a candidate has progressed
        if interview_data.job_id:
            existing_interview = await InterviewRepository.find_by_candidate_and_job(
                interview_data.candidate_id,
                interview_data.job_id,
                ["in_progress", "completed", "under_review", "approved"],
            )
            if existing_interview:
                raise HTTPException(
                    status_code=400,
                    detail="Candidate already has an active or completed interview for this job.",
                )

        # Get job details and interview configuration if job_id is provided
        job_title = None
        job_description = None
        job_description_summary = None
        interview_type = interview_data.interview_type
        skills = interview_data.skills
        custom_questions = interview_data.custom_questions
        custom_exercise_prompt = interview_data.custom_exercise_prompt

        if interview_data.job_id:
            job = await JobRepository.find_by_id(interview_data.job_id)
            if job:
                job_title = job.get("title")
                job_description = job.get("description")
                # Inherit interview configuration from job
                interview_type = job.get("interview_type", "standard")
                skills = job.get("skills")
                custom_questions = job.get("custom_questions")
                custom_exercise_prompt = job.get("custom_exercise_prompt")

                # Generate summary of job description for efficient prompt usage
                if job_description:
                    job_description_summary = (
                        await InterviewService.summarize_job_description(
                            job_description
                        )
                    )
            else:
                logger.warning(
                    "Job %s not found when creating interview for candidate %s",
                    interview_data.job_id,
                    interview_data.candidate_id,
                )

        if not job_title:
            # Fall back to the candidate's stated position so prompts stay contextual
            job_title = candidate.get("position")
            if not interview_data.job_id:
                logger.info(
                    "Creating interview without job_id for candidate %s; using candidate position '%s'",
                    interview_data.candidate_id,
                    job_title or "unknown",
                )

        # Create interview with inherited or provided configuration
        interview = Interview(
            candidate_id=interview_data.candidate_id,
            candidate_name=candidate["name"],
            position=candidate["position"],
            job_id=interview_data.job_id,
            job_title=job_title,
            job_description_summary=job_description_summary,
            status=interview_data.status if interview_data.status else "in_progress",
            interview_type=interview_type,
            skills=skills,
            custom_questions=custom_questions,
            custom_exercise_prompt=custom_exercise_prompt,
            resume_text=interview_data.resume_text,  # Resume is per-candidate
            availability_confirmed=interview_data.availability_confirmed,  # Per-job availability
        )

        doc = prepare_for_mongo(interview.model_dump())
        await InterviewRepository.create(doc)

        # Create initial AI message using type-specific greeting
        # Convert skills to dict format for prompt generation
        skills_dict = [
            skill.dict() if isinstance(skill, SkillDefinition) else skill
            for skill in (skills or [])
        ]

        greeting_config = get_interview_type_config(
            interview_type=interview_type,
            candidate_name=candidate["name"],
            position=job_title or "Creative Professional",
            skills=skills_dict,
            resume_text=interview_data.resume_text,
            custom_questions=custom_questions,
            custom_exercise_prompt=custom_exercise_prompt,
            role_description=job_description_summary or job_description,
        )

        system_msg = ChatMessage(
            interview_id=interview.id,
            role="assistant",
            content=greeting_config["initial_greeting"],
        )
        msg_doc = prepare_for_mongo(system_msg.model_dump())
        await db.messages.insert_one(msg_doc)

        return interview

    @staticmethod
    async def get_interview_instructions(interview: Interview) -> str:
        """Get the system instructions for an interview based on its type and configuration"""
        # Backward compatibility: Generate summary for old interviews
        job_description_summary = interview.job_description_summary

        if not job_description_summary and interview.job_id:
            logger.info(
                f"Auto-generating job description summary for interview {interview.id}"
            )
            try:
                job = await JobRepository.find_by_id(interview.job_id)
                if job and job.get("description"):
                    job_description_summary = (
                        await InterviewService.summarize_job_description(
                            job.get("description")
                        )
                    )
                    # Save the summary back to the interview record
                    await InterviewRepository.update_fields(
                        interview.id,
                        {"job_description_summary": job_description_summary},
                    )
                    logger.info(
                        f"Successfully saved job description summary for interview {interview.id}"
                    )
            except Exception as e:
                logger.error(f"Failed to auto-generate job description summary: {e}")

        skills_dict = [
            skill.dict() if isinstance(skill, SkillDefinition) else skill
            for skill in (interview.skills or [])
        ]

        config = get_interview_type_config(
            interview_type=interview.interview_type,
            candidate_name=interview.candidate_name,
            position=interview.job_title or "Creative Professional",
            skills=skills_dict,
            resume_text=interview.resume_text,
            custom_questions=interview.custom_questions,
            custom_exercise_prompt=interview.custom_exercise_prompt,
            role_description=job_description_summary,
        )

        return config["system_instructions"]

    @staticmethod
    async def get_interviews(
        candidate_id: str = None, job_id: str = None
    ) -> List[Interview]:
        """Get all interviews sorted by creation date with optional filtering"""
        interviews = await InterviewRepository.find_many(
            candidate_id=candidate_id, job_id=job_id
        )
        return [Interview(**parse_from_mongo(i)) for i in interviews]

    @staticmethod
    async def get_interview(interview_id: str) -> Interview:
        """Get a specific interview by ID"""
        interview = await InterviewRepository.find_by_id(interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        return Interview(**parse_from_mongo(interview))

    @staticmethod
    async def complete_interview(interview_id: str):
        """Mark interview as completed and set analysis status to pending"""
        interview = await InterviewRepository.find_by_id(interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Mark as completed and set analysis status to pending
        # Analysis will be generated on-demand when viewing results
        await InterviewRepository.update_fields(
            interview_id,
            {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "analysis_status": "pending",
            },
        )

        return {"message": "Interview completed", "status": "completed"}

    @staticmethod
    async def analyze_interview(
        interview_id: str, framework: str = "behavioral"
    ) -> Dict[str, Any]:
        """Generate AI analysis of interview and save to database"""
        try:
            # Mark analysis as processing
            await InterviewRepository.update_fields(
                interview_id, {"analysis_status": "processing"}
            )

            # Get interview
            interview_doc = await InterviewRepository.find_by_id(interview_id)
            if not interview_doc:
                await InterviewRepository.update_fields(
                    interview_id, {"analysis_status": "failed"}
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
                        "notes": "Insufficient data",
                    },
                    "technical_depth": {"score": 0, "notes": "Insufficient data"},
                    "problem_solving": {
                        "score": 0,
                        "approach": "Not assessed",
                        "example": "N/A",
                    },
                    "recommendation": "Incomplete Interview",
                    "confidence": 0,
                    "recommendations": ["Complete the full interview process"],
                    "next_steps": [],
                }
                await InterviewRepository.update_fields(
                    interview_id,
                    {
                        "analysis_status": "completed",
                        "analysis_result": default_analysis,
                    },
                )
                return default_analysis

            # Get candidate info
            candidate = await CandidateRepository.find_by_id(
                interview_doc["candidate_id"]
            )

            if not candidate:
                # Use interview data as fallback
                candidate = {
                    "name": interview_doc.get("candidate_name", "Candidate"),
                    "position": interview_doc.get("position", "Unknown"),
                    "skills": [],
                    "experience_years": 0,
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

            # Ensure skills is always a list, never None
            candidate_skills = candidate.get("skills") or []

            analysis_prompt = get_analysis_prompt(
                framework_name=framework_name,
                candidate_name=candidate["name"],
                candidate_position=interview_doc.get(
                    "job_title", "Creative Professional"
                ),
                candidate_skills=candidate_skills,
                candidate_experience_years=candidate.get("experience_years", 0),
                conversation=conversation,
            )

            completion = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": analysis_prompt},
                ],
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
                await InterviewRepository.update_fields(
                    interview_id,
                    {
                        "analysis_status": "completed",
                        "analysis_result": analysis,
                    },
                )

                return analysis

            except Exception as e:
                logger.error(f"Failed to parse analysis: {e}")
                # Return a basic analysis
                basic_analysis = {
                    "overall_score": 7,
                    "skills_breakdown": [
                        {"skill": "Communication", "score": 7, "level": "Proficient"},
                        {
                            "skill": "Creative Process",
                            "score": 7,
                            "level": "Proficient",
                        },
                    ],
                    "key_insights": ["Creative approach demonstrated"],
                    "strengths": ["Shows creative thinking"],
                    "areas_for_improvement": ["Continue developing portfolio"],
                    "recommendation": "Hire",
                    "confidence": 75,
                    "recommendations": [],
                    "next_steps": [],
                }

                # Save basic analysis to database
                await InterviewRepository.update_fields(
                    interview_id,
                    {
                        "analysis_status": "completed",
                        "analysis_result": basic_analysis,
                    },
                )

                return basic_analysis

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error analyzing interview: {e}")
            # Mark as failed
            await InterviewRepository.update_fields(
                interview_id, {"analysis_status": "failed"}
            )
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    @staticmethod
    async def delete_interview(interview_id: str) -> Dict[str, Any]:
        """
        Delete an interview by ID.
        Used by routers that need to delete interviews.

        Returns:
            Success status and message
        """
        deleted_count = await InterviewRepository.delete_by_id(interview_id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Interview not found")
        return {"success": True, "message": "Interview deleted successfully"}

    @staticmethod
    async def update_acceptance_status(interview_id: str, status: str) -> Interview:
        """
        Update the acceptance status of an interview.

        Args:
            interview_id: The interview ID
            status: New acceptance status (accepted/rejected/pending)

        Returns:
            Updated interview object
        """
        # Verify interview exists
        interview = await InterviewService.get_interview(interview_id)

        # Update acceptance status
        modified_count = await InterviewRepository.update_acceptance_status(
            interview_id, status
        )

        if modified_count == 0:
            logger.warning(f"Interview {interview_id} acceptance_status not updated")

        # Return updated interview
        return await InterviewService.get_interview(interview_id)

    @staticmethod
    async def update_interview(
        interview_id: str, update_data: Dict[str, Any]
    ) -> Interview:
        """
        Generic update method for interview fields with status validation and cascade logic.

        Args:
            interview_id: The interview ID
            update_data: Dictionary of fields to update

        Returns:
            Updated interview object
        """
        # Verify interview exists
        interview = await InterviewService.get_interview(interview_id)

        # Filter out None values
        update_data = {k: v for k, v in update_data.items() if v is not None}

        if not update_data:
            logger.warning(f"No fields to update for interview {interview_id}")
            return interview

        # Validate status transitions if status fields are being updated
        if "status" in update_data:
            valid, error = validate_status_transition(
                WorkflowType.INTERVIEW, interview.status, update_data["status"]
            )
            if not valid:
                raise HTTPException(status_code=400, detail=error)

        if "acceptance_status" in update_data:
            valid, error = validate_status_transition(
                WorkflowType.ACCEPTANCE,
                interview.acceptance_status,
                update_data["acceptance_status"],
            )
            if not valid:
                raise HTTPException(status_code=400, detail=error)

            # Handle acceptance status cascade logic
            new_acceptance_status = update_data["acceptance_status"]
            if new_acceptance_status == "accepted":
                logger.info(
                    f"Interview {interview_id} accepted, will cascade to assignments"
                )
                # Cascade logic handled after update
            elif new_acceptance_status == "rejected":
                logger.info(
                    f"Interview {interview_id} rejected, will cascade to assignments"
                )

        # Perform update
        modified_count = await InterviewRepository.update_fields(
            interview_id, update_data
        )

        if modified_count == 0:
            logger.warning(f"Interview {interview_id} not updated")

        # Handle cascading changes for acceptance status
        if "acceptance_status" in update_data:
            await InterviewService._handle_acceptance_cascade(
                interview_id, interview, update_data["acceptance_status"]
            )

        # Return updated interview
        return await InterviewService.get_interview(interview_id)

    @staticmethod
    async def _handle_acceptance_cascade(
        interview_id: str, interview: Interview, new_acceptance_status: str
    ):
        """
        Handle cascade logic when acceptance status changes.

        Args:
            interview_id: The interview ID
            interview: The interview object (before update)
            new_acceptance_status: The new acceptance status
        """
        if new_acceptance_status == "accepted":
            # Create or activate assignment if project_id exists
            if interview.project_id:
                try:
                    from repositories.assignment_repository import AssignmentRepository
                    from models.assignment import Assignment

                    # Check if assignment already exists
                    existing_assignment = await AssignmentRepository.find_by_interview(
                        interview_id
                    )

                    if existing_assignment:
                        # Reactivate if it was removed
                        if existing_assignment.get("status") == "removed":
                            await AssignmentRepository.update_fields(
                                existing_assignment["id"], {"status": "active"}
                            )
                            logger.info(
                                f"Reactivated assignment for interview {interview_id}"
                            )
                    else:
                        # Create new assignment
                        assignment = Assignment(
                            project_id=interview.project_id,
                            candidate_id=interview.candidate_id,
                            interview_id=interview_id,
                            status="active",
                        )
                        await AssignmentRepository.create(
                            prepare_for_mongo(assignment.model_dump())
                        )
                        logger.info(
                            f"Created assignment for interview {interview_id} in project {interview.project_id}"
                        )
                except Exception as e:
                    logger.error(f"Error creating/activating assignment: {e}")

        elif new_acceptance_status == "rejected":
            # Remove assignment if it exists
            if interview.project_id:
                try:
                    from repositories.assignment_repository import AssignmentRepository

                    existing_assignment = await AssignmentRepository.find_by_interview(
                        interview_id
                    )

                    if (
                        existing_assignment
                        and existing_assignment.get("status") == "active"
                    ):
                        await AssignmentRepository.update_fields(
                            existing_assignment["id"], {"status": "removed"}
                        )
                        logger.info(f"Removed assignment for interview {interview_id}")
                except Exception as e:
                    logger.error(f"Error removing assignment: {e}")

    @staticmethod
    async def update_transcript_and_complete(
        interview_id: str, transcript: List[Dict[str, Any]]
    ) -> None:
        """
        Update interview transcript and mark as completed.
        Used by websocket when interview session ends.

        Args:
            interview_id: The interview ID
            transcript: Sorted transcript entries
        """
        from datetime import datetime, timezone

        completed_at = datetime.now(timezone.utc)
        await InterviewRepository.update_transcript_and_complete(
            interview_id, transcript, completed_at
        )

    @staticmethod
    async def update_video_url(interview_id: str, video_url: str) -> None:
        """
        Update the video URL for an interview.
        Used after video upload completes.

        Args:
            interview_id: The interview ID
            video_url: S3 key or URL for the video
        """
        await InterviewRepository.update_video_url(interview_id, video_url)

    @staticmethod
    async def get_or_create_interview_for_session(
        interview_id: str,
        candidate_id: Optional[str] = None,
        candidate_name: Optional[str] = None,
        job_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get an existing interview or create a new one for a websocket session.
        This handles the complex logic of checking for duplicates and creating interviews.

        Args:
            interview_id: The interview ID
            candidate_id: Optional candidate ID
            candidate_name: Optional candidate name
            job_id: Optional job ID

        Returns:
            Interview document
        """
        # Try to find existing interview
        interview_doc = await InterviewRepository.find_by_id(interview_id)

        if not interview_doc:
            # Check for duplicate if job_id provided
            if candidate_id and job_id:
                existing_for_job = await InterviewRepository.find_by_candidate_and_job(
                    candidate_id,
                    job_id,
                    ["in_progress", "completed", "under_review", "approved"],
                )
                if existing_for_job:
                    raise HTTPException(
                        status_code=400,
                        detail="You have already completed this interview.",
                    )

            # Create new interview document
            interview_doc = {
                "id": interview_id,
                "status": "in_progress",
                "created_at": datetime.now(timezone.utc),
                "transcript": [],
                "acceptance_status": "pending",
                "candidate_id": candidate_id,
                "candidate_name": candidate_name or "Unknown",
            }

            # Add job information if job_id provided
            if job_id:
                job = await JobRepository.find_by_id(job_id)
                if job:
                    interview_doc["job_id"] = job_id
                    interview_doc["job_title"] = job.get("title")
                    interview_doc["position"] = job.get("title")
                    interview_doc["interview_type"] = job.get(
                        "interview_type", "standard"
                    )
                    interview_doc["skills"] = job.get("skills")
                    interview_doc["custom_questions"] = job.get("custom_questions")
                    interview_doc["custom_exercise_prompt"] = job.get(
                        "custom_exercise_prompt"
                    )

            # Save to database
            await InterviewRepository.create(interview_doc)

        return interview_doc
