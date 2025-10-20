#!/usr/bin/env python3
"""
Import annotator profile data from a CSV export into the MongoDB users collection.

Each row is upserted (matched on email) so the dashboard can surface the
profiles on the Candidate Marketplace view.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure the backend package is importable when the script is executed from repo root.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.database import get_users_collection  # noqa: E402
from backend.utils import prepare_for_mongo  # noqa: E402


CSV_HEADER_TIMESTAMP = "Timestamp"
CSV_HEADER_NAME = "Name"
CSV_HEADER_EMAIL = "Email"
CSV_HEADER_LANGUAGES = "Besides English, what languages are you proficient in?"
CSV_HEADER_LINKEDIN = "LinkedIn profile"
CSV_HEADER_RESUME = "Submit your CV"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import annotator profiles into MongoDB from a CSV export."
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path(
            "Language Tutor – AI Training Project (Responses) - Form Responses 1.csv"
        ),
        help="Path to the CSV file to import (default: %(default)s)",
    )
    parser.add_argument(
        "--position",
        default="Language Tutor",
        help="Fallback position/title to assign when creating profiles.",
    )
    parser.add_argument(
        "--experience-years",
        type=int,
        default=0,
        help="Default experience years to assign when the CSV omits that detail.",
    )
    return parser.parse_args()


def parse_timestamp(value: str) -> datetime:
    """Parse the timestamp column, falling back to 'now' on failure."""
    value = (value or "").strip()
    if not value:
        return datetime.now(timezone.utc)

    for fmt in ("%m/%d/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(value, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    return datetime.now(timezone.utc)


def normalise_languages(value: str) -> List[str]:
    """Split language responses on commas and strip whitespace."""
    if not value:
        return []

    parts = [part.strip() for part in value.split(",")]
    return [part for part in parts if part]


def build_profile_payload(
    row: Dict[str, str],
    *,
    default_position: str,
    default_experience_years: int,
) -> Dict[str, Any]:
    """Create the Mongo document to upsert for a single row."""
    email = (row.get(CSV_HEADER_EMAIL) or "").strip().lower()
    name = (row.get(CSV_HEADER_NAME) or "").strip()

    languages = normalise_languages(row.get(CSV_HEADER_LANGUAGES, ""))
    timestamp = parse_timestamp(row.get(CSV_HEADER_TIMESTAMP, ""))

    # Compose a concise bio so the Candidate Marketplace page has content to show.
    if languages:
        languages_text = ", ".join(languages)
        bio = f"{name or email} is proficient in {languages_text}."
    else:
        bio = f"{name or email} is an experienced professional ready for tutoring projects."

    payload: Dict[str, Any] = {
        "email": email,
        "username": email.split("@")[0] if email and "@" in email else None,
        "name": name or email.split("@")[0],
        "position": default_position,
        "skills": languages,
        "expertise": languages,
        "bio": bio,
        "experience_years": default_experience_years,
        "profile_completed": True,
        "created_at": timestamp,
        "resume_url": (row.get(CSV_HEADER_RESUME) or "").strip() or None,
        "linkedin_url": (row.get(CSV_HEADER_LINKEDIN) or "").strip() or None,
        "source": "language-tutor-import",
    }

    # Remove None values to avoid overwriting existing data with nulls.
    return {key: value for key, value in payload.items() if value is not None}


async def upsert_profile(
    users_collection,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Insert or update a single annotator profile."""
    email = payload["email"]
    existing: Optional[Dict[str, Any]] = await users_collection.find_one({"email": email})

    if existing:
        # Preserve the existing id and created_at unless they are missing.
        payload.setdefault("id", existing.get("id"))
        payload.setdefault("created_at", existing.get("created_at"))

        prepared = prepare_for_mongo(payload.copy())
        await users_collection.update_one({"email": email}, {"$set": prepared})
        action = "updated"
        record_id = payload.get("id", existing.get("id"))
    else:
        payload.setdefault("id", str(uuid.uuid4()))
        prepared = prepare_for_mongo(payload.copy())
        await users_collection.insert_one(prepared)
        action = "inserted"
        record_id = payload["id"]

    return {"email": email, "action": action, "id": record_id}


async def import_profiles(args: argparse.Namespace) -> None:
    csv_path: Path = args.csv
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    users_collection = get_users_collection()
    results: List[Dict[str, Any]] = []

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            email = (row.get(CSV_HEADER_EMAIL) or "").strip()
            if not email:
                continue

            payload = build_profile_payload(
                row,
                default_position=args.position,
                default_experience_years=args.experience_years,
            )
            result = await upsert_profile(users_collection, payload)
            results.append(result)

    inserted = sum(1 for item in results if item["action"] == "inserted")
    updated = sum(1 for item in results if item["action"] == "updated")

    print(f"Processed {len(results)} rows ({inserted} inserted, {updated} updated).")


def main() -> None:
    args = parse_args()
    asyncio.run(import_profiles(args))


if __name__ == "__main__":
    main()
