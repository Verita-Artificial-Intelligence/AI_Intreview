from fastapi import APIRouter
from services import AnalysisService

router = APIRouter(prefix="/interviews", tags=["Analysis"])


@router.post("/{interview_id}/analyze")
async def analyze_interview(interview_id: str, framework: str = "behavioral"):
    """Generate comprehensive AI analysis of interview performance with framework-based evaluation"""
    return await AnalysisService.analyze_interview(interview_id, framework)
