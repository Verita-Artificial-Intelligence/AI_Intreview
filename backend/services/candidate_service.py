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

        # Build the user profile document ensuring required fields exist for dashboard
        profile_doc = candidate.model_dump()
        profile_doc.update(
            {
                "username": candidate.email.split("@")[0],
                "profile_completed": True,
                "skills": candidate.skills,
                "expertise": candidate.skills,
                "experience_years": candidate.experience_years,
                "bio": candidate.bio,
                "position": candidate.position,
            }
        )

        existing = await users_collection.find_one({"email": candidate.email})
        if existing:
            existing = parse_from_mongo(existing)
            profile_doc["id"] = existing.get("id", profile_doc["id"])
            profile_doc["created_at"] = existing.get("created_at", profile_doc["created_at"])

        prepared_doc = prepare_for_mongo(profile_doc.copy())

        if existing:
            await users_collection.update_one({"email": candidate.email}, {"$set": prepared_doc})
        else:
            await users_collection.insert_one(prepared_doc)

        stored = await users_collection.find_one({"email": candidate.email}, {"_id": 0})
        stored = parse_from_mongo(stored)

        # Normalise fields for Candidate schema
        skills = stored.get("skills") or []
        if not isinstance(skills, list):
            skills = [skills]

        education = stored.get("education", candidate_data.education or "")
        if isinstance(education, list):
            education = ", ".join(str(item) for item in education if item)
        elif education is None:
            education = ""

        return Candidate(
            id=stored.get("id", candidate.id),
            name=stored.get("name", candidate_data.name),
            email=stored["email"],
            position=stored.get("position", candidate_data.position),
            skills=skills,
            experience_years=stored.get("experience_years", candidate_data.experience_years),
            bio=stored.get("bio", candidate_data.bio),
            education=education,
            created_at=stored.get("created_at", candidate.created_at),
        )

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
            # Only require name and bio (profile_completed already filters for basics)
            if user.name and user.bio:
                # Use expertise as skills if skills not populated (new profile system)
                skills_list = user.skills or user.expertise or []

                candidate = Candidate(
                    id=user.id,
                    name=user.name,
                    email=user.email,
                    position=user.position or "Creative Professional",
                    skills=skills_list,
                    experience_years=user.experience_years or 0,
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

        # Verify user has completed profile (only require name and bio)
        if not user.profile_completed or not user.name or not user.bio:
            raise HTTPException(
                status_code=404, detail="Candidate profile not completed"
            )

        # Use expertise as skills if skills not populated (new profile system)
        skills_list = user.skills or user.expertise or []

        candidate = Candidate(
            id=user.id,
            name=user.name,
            email=user.email,
            position=user.position or "Creative Professional",
            skills=skills_list,
            experience_years=user.experience_years or 0,
            bio=user.bio,
            created_at=user.created_at,
        )

        return candidate
