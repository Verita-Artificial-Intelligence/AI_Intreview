from fastapi import HTTPException
from typing import List, Optional, Dict, Any
from models import Candidate, CandidateCreate, User
from utils import prepare_for_mongo, parse_from_mongo
from database import get_users_collection


class CandidateService:
    @staticmethod
    def _build_education_entries(education: Any) -> Optional[List[Dict[str, Any]]]:
        """Normalise various education formats into the list-of-dicts shape stored on User."""
        if not education:
            return None

        entries: List[Dict[str, Any]] = []

        if isinstance(education, list):
            # Already list-like; coerce inner values.
            for item in education:
                if isinstance(item, dict):
                    if any(value for value in item.values()):
                        entries.append(item)
                elif isinstance(item, str):
                    value = item.strip()
                    if value:
                        entries.append({"institution": value})
        elif isinstance(education, str):
            value = education.strip()
            if value:
                entries.append({"institution": value})
        else:
            # Unknown structure, attempt string conversion
            value = str(education).strip()
            if value:
                entries.append({"institution": value})

        return entries or None

    @staticmethod
    def _normalise_user_doc(user_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure the mongo document matches the Pydantic schema expectations."""
        normalised = user_doc.copy()

        # Skills / expertise should be lists.
        for key in ("skills", "expertise"):
            value = normalised.get(key)
            if isinstance(value, str):
                normalised[key] = [v.strip() for v in value.split(",") if v.strip()]
            elif value is None:
                normalised[key] = []

        # Experience years coerced to int.
        try:
            normalised["experience_years"] = int(normalised.get("experience_years", 0) or 0)
        except (TypeError, ValueError):
            normalised["experience_years"] = 0

        # Education must be list[dict]
        education_entries = CandidateService._build_education_entries(normalised.get("education"))
        if education_entries:
            normalised["education"] = education_entries
        else:
            normalised.pop("education", None)

        return normalised

    @staticmethod
    async def create_candidate(candidate_data: CandidateCreate) -> Candidate:
        """Create a new candidate"""
        users_collection = get_users_collection()
        candidate = Candidate(**candidate_data.model_dump())

        education_entries = CandidateService._build_education_entries(candidate_data.education)

        # Build the user profile document ensuring required fields exist for dashboard
        profile_doc: Dict[str, Any] = {
            "id": candidate.id,
            "name": candidate.name,
            "email": candidate.email,
            "position": candidate.position,
            "skills": candidate.skills,
            "expertise": candidate.skills,
            "experience_years": candidate.experience_years,
            "bio": candidate.bio,
            "username": candidate.email.split("@")[0],
            "profile_completed": True,
            "created_at": candidate.created_at,
        }
        if education_entries:
            profile_doc["education"] = education_entries

        existing = await users_collection.find_one({"email": candidate.email})
        if existing:
            existing = parse_from_mongo(existing)
            profile_doc["id"] = existing.get("id", profile_doc["id"])
            profile_doc["created_at"] = existing.get("created_at", profile_doc["created_at"])

        profile_doc = CandidateService._normalise_user_doc(profile_doc)
        prepared_doc = prepare_for_mongo(profile_doc.copy())

        if existing:
            await users_collection.update_one({"email": candidate.email}, {"$set": prepared_doc})
        else:
            await users_collection.insert_one(prepared_doc)

        stored = await users_collection.find_one({"email": candidate.email}, {"_id": 0})
        stored = CandidateService._normalise_user_doc(parse_from_mongo(stored))

        # Normalise fields for Candidate schema
        skills = stored.get("skills") or stored.get("expertise") or []
        if not isinstance(skills, list):
            skills = [skills]

        education_summary = candidate_data.education or ""
        education_entries = stored.get("education")
        if isinstance(education_entries, list):
            fragments = []
            for entry in education_entries:
                if isinstance(entry, dict):
                    parts = [
                        entry.get("degree"),
                        entry.get("institution"),
                        entry.get("field"),
                        entry.get("details"),
                        entry.get("description"),
                    ]
                    text = ", ".join(part for part in parts if part)
                    if text:
                        fragments.append(text)
                elif isinstance(entry, str):
                    value = entry.strip()
                    if value:
                        fragments.append(value)
            education_summary = "; ".join(fragments)
        elif isinstance(education_entries, str):
            education_summary = education_entries

        return Candidate(
            id=stored.get("id", candidate.id),
            name=stored.get("name", candidate_data.name),
            email=stored["email"],
            position=stored.get("position", candidate_data.position),
            skills=skills,
            experience_years=stored.get("experience_years", candidate_data.experience_years),
            bio=stored.get("bio", candidate_data.bio),
            education=education_summary or "",
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
            normalised_doc = CandidateService._normalise_user_doc(user_doc)
            user = User(**normalised_doc)
            # Only require name and bio (profile_completed already filters for basics)
            if user.name and user.bio:
                # Use expertise as skills if skills not populated (new profile system)
                skills_list = normalised_doc.get("skills") or normalised_doc.get("expertise") or []
                if not isinstance(skills_list, list):
                    skills_list = [skills_list] if skills_list else []

                education_entries = normalised_doc.get("education")
                education_summary = ""
                if isinstance(education_entries, list):
                    fragments = []
                    for entry in education_entries:
                        if isinstance(entry, dict):
                            parts = [
                                entry.get("degree"),
                                entry.get("institution"),
                                entry.get("field"),
                                entry.get("details"),
                                entry.get("description"),
                            ]
                            text = ", ".join(part for part in parts if part)
                            if text:
                                fragments.append(text)
                        elif isinstance(entry, str):
                            value = entry.strip()
                            if value:
                                fragments.append(value)
                    education_summary = "; ".join(fragments)
                elif isinstance(education_entries, str):
                    education_summary = education_entries

                candidate = Candidate(
                    id=user.id,
                    name=user.name,
                    email=user.email,
                    position=user.position or "Creative Professional",
                    skills=skills_list,
                    experience_years=normalised_doc.get("experience_years", user.experience_years or 0),
                    bio=user.bio,
                    education=education_summary,
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
