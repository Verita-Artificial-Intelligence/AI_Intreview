"""In-memory data store used for local development and tests."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional


def _current_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _apply_projection(document: Dict[str, Any], projection: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    result = dict(document)
    if projection and projection.get("_id") == 0:
        result.pop("_id", None)
    return result


def _value_as_string(value: Any) -> str:
    if isinstance(value, list):
        return " ".join(str(item) for item in value)
    if value is None:
        return ""
    return str(value)


def _match_query(document: Dict[str, Any], query: Optional[Dict[str, Any]]) -> bool:
    if not query:
        return True

    for key, value in query.items():
        if key == "$or":
            return any(_match_query(document, condition) for condition in value)

        if isinstance(value, dict) and "$regex" in value:
            pattern = value["$regex"]
            options = value.get("$options", "")
            flags = re.IGNORECASE if "i" in options.lower() else 0
            target = _value_as_string(document.get(key, ""))
            if re.search(pattern, target, flags) is None:
                return False
        else:
            if document.get(key) != value:
                return False

    return True


class InMemoryCursor:
    def __init__(self, documents: Iterable[Dict[str, Any]]):
        self._documents: List[Dict[str, Any]] = [dict(doc) for doc in documents]

    def sort(self, key: str, direction: int) -> "InMemoryCursor":
        reverse = direction < 0
        self._documents.sort(key=lambda doc: doc.get(key), reverse=reverse)
        return self

    async def to_list(self, length: int) -> List[Dict[str, Any]]:
        if length <= 0:
            return []
        return [dict(doc) for doc in self._documents[:length]]


class InMemoryCollection:
    def __init__(self, documents: Optional[Iterable[Dict[str, Any]]] = None):
        self.documents: List[Dict[str, Any]] = [dict(doc) for doc in (documents or [])]

    async def insert_one(self, document: Dict[str, Any]) -> Dict[str, Any]:
        doc = dict(document)
        doc.setdefault("id", str(uuid.uuid4()))
        self.documents.append(doc)
        return {"inserted_id": doc["id"]}

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        for document in self.documents:
            if _match_query(document, query):
                return _apply_projection(document, projection)
        return None

    def find(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> InMemoryCursor:
        matched = [_apply_projection(doc, projection) for doc in self.documents if _match_query(doc, query)]
        return InMemoryCursor(matched)

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, int]:
        for document in self.documents:
            if _match_query(document, query):
                for key, value in update.get("$set", {}).items():
                    document[key] = value
                return {"matched_count": 1, "modified_count": 1}
        return {"matched_count": 0, "modified_count": 0}


class InMemoryDatabase:
    """Simple in-memory replacement for MongoDB used during local development."""

    def __init__(self):
        self.reset()

    def reset(self) -> None:
        timestamp = _current_timestamp()

        self.candidates = InMemoryCollection(
            [
                {
                    "id": "candidate-1",
                    "name": "Alex Johnson",
                    "email": "alex.johnson@example.com",
                    "skills": ["React", "TypeScript", "Node.js"],
                    "experience_years": 6,
                    "position": "Frontend Engineer",
                    "bio": "Frontend engineer with a passion for crafting polished user experiences.",
                    "created_at": timestamp,
                },
                {
                    "id": "candidate-2",
                    "name": "Priya Singh",
                    "email": "priya.singh@example.com",
                    "skills": ["Python", "FastAPI", "PostgreSQL"],
                    "experience_years": 7,
                    "position": "Backend Engineer",
                    "bio": "Backend specialist with extensive cloud and API experience.",
                    "created_at": timestamp,
                },
                {
                    "id": "candidate-3",
                    "name": "Marcus Lee",
                    "email": "marcus.lee@example.com",
                    "skills": ["Product Management", "Roadmapping", "Stakeholder Alignment"],
                    "experience_years": 8,
                    "position": "Product Manager",
                    "bio": "Product leader focused on delivering measurable business outcomes.",
                    "created_at": timestamp,
                },
            ]
        )

        self.interviews = InMemoryCollection(
            [
                {
                    "id": "interview-1",
                    "candidate_id": "candidate-1",
                    "candidate_name": "Alex Johnson",
                    "position": "Frontend Engineer",
                    "status": "in_progress",
                    "created_at": timestamp,
                }
            ]
        )

        self.messages = InMemoryCollection(
            [
                {
                    "id": "msg-1",
                    "interview_id": "interview-1",
                    "role": "assistant",
                    "content": "Hello! I'm your AI interviewer. Let's start with an overview of your experience.",
                    "timestamp": timestamp,
                }
            ]
        )

        self.users = InMemoryCollection([])


class InMemoryMongoClient:
    """Compatibility wrapper so the in-memory DB mimics Motor's client."""

    def __init__(self, database: InMemoryDatabase):
        self._database = database

    def __getitem__(self, name: str) -> InMemoryDatabase:
        return self._database

    def close(self) -> None:  # pragma: no cover - no-op for compatibility
        return None


__all__ = [
    "InMemoryCollection",
    "InMemoryCursor",
    "InMemoryDatabase",
    "InMemoryMongoClient",
]



