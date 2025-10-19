from fastapi import HTTPException
import logging
import json
import re
from openai import AsyncOpenAI
from database import db
from config import OPENAI_API_KEY, EVALUATION_FRAMEWORKS
from prompts.interview_analysis import get_analysis_prompt, SYSTEM_PROMPT

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)


class AnalysisService:
    @staticmethod
    async def analyze_interview(interview_id: str, framework: str = "behavioral"):
        """Generate comprehensive AI analysis of interview performance with framework-based evaluation"""
        try:
            interview = await db.interviews.find_one({"id": interview_id})
            if not interview:
                raise HTTPException(status_code=404, detail="Interview not found")

            # Get candidate and messages
            candidate = await db.candidates.find_one({"id": interview["candidate_id"]})
            messages = await db.messages.find(
                {"interview_id": interview_id}, {"_id": 0}
            ).to_list(1000)

            # Check for insufficient data
            if len(messages) < 3:
                return AnalysisService._create_insufficient_data_response()

            # Build conversation with timestamps
            conversation_with_timestamps = []
            for i, m in enumerate(messages):
                timestamp = f"[{i+1}]"
                conversation_with_timestamps.append(
                    f"{timestamp} {m['role'].upper()}: {m['content']}"
                )

            conversation = "\n".join(conversation_with_timestamps)
            framework_name = EVALUATION_FRAMEWORKS.get(
                framework, "General Interview Assessment"
            )

            # Generate analysis prompt
            analysis_prompt = get_analysis_prompt(
                framework_name=framework_name,
                candidate_name=candidate["name"],
                candidate_position=candidate["position"],
                candidate_skills=candidate["skills"],
                candidate_experience_years=candidate["experience_years"],
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

            # Parse AI response
            try:
                # Try to find JSON in response
                json_match = re.search(r"\{.*\}", response, re.DOTALL)
                if json_match:
                    analysis = json.loads(json_match.group())
                else:
                    raise ValueError("No JSON found in AI response")

                # Validate and ensure all required fields
                analysis = AnalysisService._validate_analysis_structure(analysis)

            except Exception as parse_error:
                logging.error(f"Parse error: {parse_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to parse AI analysis response: {str(parse_error)}",
                )

            return analysis

        except Exception as e:
            logging.error(f"Analysis error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

    @staticmethod
    def _create_insufficient_data_response():
        """Create response for interviews with insufficient data"""
        return {
            "overall_score": 0,
            "overall_quality_score": 0,
            "skills_breakdown": [],
            "key_insights": ["Insufficient interview data for comprehensive analysis"],
            "strengths": ["Interview too short to assess"],
            "areas_for_improvement": [
                "Complete a full interview for detailed analysis"
            ],
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
            "cultural_alignment": {
                "score": 0,
                "values_match": "Not assessed",
                "team_fit": "Not assessed",
            },
            "recommendation": "Incomplete Interview",
            "confidence": 0,
            "recommendations": ["Complete the full interview process"],
            "next_steps": ["Schedule a comprehensive interview"],
            "framework_specific_analysis": {"status": "Insufficient data for analysis"},
        }

    @staticmethod
    def _validate_analysis_structure(analysis):
        """Ensure analysis has all required fields"""
        required_fields = {
            "overall_score": 0,
            "overall_quality_score": 0,
            "skills_breakdown": [],
            "key_insights": [],
            "strengths": [],
            "areas_for_improvement": [],
            "red_flags": [],
            "standout_moments": [],
            "communication_assessment": {
                "clarity_score": 0,
                "articulation_score": 0,
                "confidence_score": 0,
                "notes": "",
            },
            "technical_depth": {"score": 0, "notes": ""},
            "problem_solving": {"score": 0, "approach": "", "example": ""},
            "cultural_alignment": {"score": 0, "values_match": "", "team_fit": ""},
            "recommendation": "Hire",
            "confidence": 75,
            "recommendations": [],
            "next_steps": [],
            "framework_specific_analysis": {},
        }

        for field, default in required_fields.items():
            if field not in analysis:
                analysis[field] = default

        # Ensure scores are in valid ranges
        analysis["overall_score"] = max(
            0, min(10, float(analysis.get("overall_score", 0)))
        )
        analysis["overall_quality_score"] = max(
            0, min(100, int(analysis.get("overall_quality_score", 0)))
        )
        analysis["confidence"] = max(0, min(100, int(analysis.get("confidence", 0))))

        return analysis
