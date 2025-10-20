#!/usr/bin/env bash

set -euo pipefail

# Determine repository root and default CSV path.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEFAULT_CSV="${REPO_ROOT}/Language Tutor – AI Training Project (Responses) - Form Responses 1.csv"

CSV_PATH="${1:-${DEFAULT_CSV}}"
API_BASE="${API_BASE:-http://localhost:8001}"
API_ENDPOINT="${API_ENDPOINT:-${API_BASE}/api/candidates}"
DEFAULT_POSITION="${POSITION:-Language Tutor}"
DEFAULT_EXPERIENCE_YEARS="${EXPERIENCE_YEARS:-0}"

if [[ ! -f "${CSV_PATH}" ]]; then
  echo "CSV file not found: ${CSV_PATH}" >&2
  exit 1
fi

echo "Importing annotator profiles from:"
echo "  CSV: ${CSV_PATH}"
echo "  Endpoint: ${API_ENDPOINT}"
echo

python3 - <<'PY' "${CSV_PATH}" "${API_ENDPOINT}" "${DEFAULT_POSITION}" "${DEFAULT_EXPERIENCE_YEARS}"
import csv
import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

csv_path = Path(sys.argv[1])
endpoint = sys.argv[2]
default_position = sys.argv[3]

try:
    default_experience_years = int(sys.argv[4])
except (ValueError, TypeError):
    default_experience_years = 0


def normalise_languages(value: str):
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


processed = success = failed = 0

with csv_path.open(newline="", encoding="utf-8") as handle:
    reader = csv.DictReader(handle)
    for row in reader:
        email = (row.get("Email") or "").strip().lower()
        name = (row.get("Name") or "").strip()
        languages = normalise_languages(row.get("Besides English, what languages are you proficient in?") or "")

        if not email:
            continue

        bio = (
            f"{name or email} is proficient in {', '.join(languages)}."
            if languages
            else f"{name or email} is an experienced professional ready for tutoring projects."
        )

        payload = {
            "name": name or email.split("@")[0],
            "email": email,
            "position": default_position,
            "skills": languages,
            "experience_years": default_experience_years,
            "bio": bio,
            "education": (row.get("Submit your CV") or "").strip(),
        }

        request = Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=30) as response:
                status = response.status
                response_body = response.read().decode("utf-8", errors="ignore")
        except HTTPError as exc:
            failed += 1
            print(f"[FAIL] {email}: HTTP {exc.code} - {exc.read().decode('utf-8', errors='ignore')}", file=sys.stderr)
            continue
        except URLError as exc:
            failed += 1
            print(f"[FAIL] {email}: {exc}", file=sys.stderr)
            continue

        processed += 1
        if status in (200, 201):
            success += 1
            action = "upserted"
        elif status == 204:
            success += 1
            action = "updated"
        else:
            failed += 1
            print(f"[FAIL] {email}: unexpected HTTP status {status} - {response_body}", file=sys.stderr)
            continue
        print(f"[OK] {email}: {action} ({status})")

print()
print(f"Processed {processed} profiles (successful: {success}, failed: {failed}).")
PY
