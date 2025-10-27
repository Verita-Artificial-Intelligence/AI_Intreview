from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models import User, ProfileComplete
from services import ProfileService
from services.linkedin_service import scrape_linkedin_profile
from dependencies import require_candidate_user

router = APIRouter()


class LinkedInScrapeRequest(BaseModel):
    linkedin_url: str


@router.get("/me", response_model=User)
async def get_my_profile(current_user: User = Depends(require_candidate_user)):
    """Get current user's profile (Clerk authenticated)"""
    return current_user


@router.put("/complete", response_model=User)
async def complete_profile(
    profile_data: ProfileComplete, current_user: User = Depends(require_candidate_user)
):
    """Complete user profile after signup (Clerk authenticated)"""
    return await ProfileService.complete_profile(current_user.id, profile_data)


@router.get("/interview-status")
async def get_interview_status(current_user: User = Depends(require_candidate_user)):
    """Get current user's interview status (Clerk authenticated)"""
    return await ProfileService.get_interview_status(current_user.id)


@router.post("/scrape-linkedin")
async def scrape_linkedin(
    request: LinkedInScrapeRequest, current_user: User = Depends(require_candidate_user)
):
    """Scrape LinkedIn profile to auto-fill profile data (Clerk authenticated)"""
    try:
        profile_data = await scrape_linkedin_profile(request.linkedin_url)

        if not profile_data:
            raise HTTPException(
                status_code=400,
                detail="Failed to scrape LinkedIn profile. Please check the URL and try again, or fill in your information manually.",
            )

        return profile_data
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Unexpected error in scrape_linkedin endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while scraping the LinkedIn profile. Please try again or fill in your information manually.",
        )
