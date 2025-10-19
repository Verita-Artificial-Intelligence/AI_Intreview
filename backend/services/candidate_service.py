from fastapi import HTTPException
from typing import List, Optional
from models import Candidate, CandidateCreate, User
from utils import prepare_for_mongo, parse_from_mongo
from database import get_users_collection


class CandidateService:
    @staticmethod
    async def create_candidate(candidate_data: CandidateCreate) -> Candidate:
        """Create a new candidate"""
        users_collection = get_users_collection()
        candidate = Candidate(**candidate_data.model_dump())
        doc = prepare_for_mongo(candidate.model_dump())
        await users_collection.insert_one(doc)
        return candidate

    @staticmethod
    async def get_candidates(search: Optional[str] = None) -> List[Candidate]:
        """Get all candidates with optional search filter - queries users with completed profiles"""
        users_collection = get_users_collection()

        query = {"profile_completed": True}

        if search:
            query["$and"] = [
                {"profile_completed": True},
                {
                    "$or": [
                        {"name": {"$regex": search, "$options": "i"}},
                        {"position": {"$regex": search, "$options": "i"}},
                        {"skills": {"$elemMatch": {"$regex": search, "$options": "i"}}},
                    ]
                },
            ]

        users = await users_collection.find(
            query, {"_id": 0, "password_hash": 0}
        ).to_list(100)

        # Convert users to candidates format
        candidates = []
        for user_doc in users:
            user = User(**user_doc)
            if (
                user.name
                and user.position
                and user.skills
                and user.experience_years is not None
                and user.bio
            ):
                candidate = Candidate(
                    id=user.id,
                    name=user.name,
                    email=user.email,
                    position=user.position,
                    skills=user.skills,
                    experience_years=user.experience_years,
                    bio=user.bio,
                    created_at=user.created_at,
                )
                candidates.append(candidate)

        return candidates

    @staticmethod
    async def get_candidate(candidate_id: str) -> Candidate:
        """Get a specific candidate by ID - queries users collection"""
        users_collection = get_users_collection()

        user_doc = await users_collection.find_one(
            {"id": candidate_id}, {"_id": 0, "password_hash": 0}
        )
        if not user_doc:
            raise HTTPException(status_code=404, detail="Candidate not found")

        user = User(**user_doc)

        # Verify user has completed profile
        if not user.profile_completed or not user.name or not user.position:
            raise HTTPException(
                status_code=404, detail="Candidate profile not completed"
            )

        candidate = Candidate(
            id=user.id,
            name=user.name,
            email=user.email,
            position=user.position,
            skills=user.skills or [],
            experience_years=user.experience_years or 0,
            bio=user.bio or "",
            created_at=user.created_at,
        )

        return candidate
