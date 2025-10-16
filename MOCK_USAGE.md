# Mock Data & Test Setup

## Backend (FastAPI)

To run the API with the in-memory data store:

```bash
USE_IN_MEMORY_DB=true /Users/rishi/AI_Intreview/venv311/bin/uvicorn server:app --reload
```

Endpoints will serve static candidate/interview data defined in `backend/in_memory_db.py`.

Run backend tests (also stubbed):

```bash
/Users/rishi/AI_Intreview/venv311/bin/python -m pytest /Users/rishi/AI_Intreview/tests
```

## Frontend

Install once (already done):

```bash
cd /Users/rishi/AI_Intreview/frontend
yarn install
```

Run dev server:

```bash
yarn start
```

Frontend tests currently require React 18; they fail under React 19.
