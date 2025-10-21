# AI Interview Setup Guide

## Prerequisites

- Python 3.10+
- Node.js 18+
- **MongoDB (local or cloud instance)** — required; the application will not run without it
- OpenAI API key with access to the Realtime API
- FFmpeg installed locally and available on `PATH` (needed for media muxing)

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

5. Edit `.env` and add your credentials:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=ai_interview
JWT_SECRET=your-secret-key-change-this
OPENAI_API_KEY=your-openai-api-key-here
CORS_ORIGINS=http://localhost:3000
```

6. Start the backend server:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

## Frontend Setup

This project includes two separate frontend applications:

### Dashboard Frontend (for Interviewers/Administrators)

1. Navigate to the dashboard frontend directory:
```bash
cd dashboard-frontend
```

2. Install dependencies:
```bash
yarn install
# or
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env  # if .env.example exists
```

4. Edit `.env` to point to your backend:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

5. Start the development server:
```bash
yarn start
# or
npm start
```

The dashboard frontend will be available at `http://localhost:3000`

### Interview Frontend (for Candidates)

1. Navigate to the interview frontend directory:
```bash
cd interview-frontend
```

2. Install dependencies:
```bash
yarn install
# or
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env  # if .env.example exists
```

4. Edit `.env` to point to your backend:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

5. Start the development server:
```bash
yarn start
# or
npm start
```

By default the interview client runs on `http://localhost:3001`. If another process already uses that port, set `PORT=3001` (or another free port) before starting.

**Tip:** Run the dashboard on port 3000 and the interview client on port 3001 for a seamless multi-app workflow.

## Media & Realtime Overview

- **FFmpeg requirement** – the backend invokes `ffmpeg` to mux microphone/AI audio with the recorded WebM. If FFmpeg is missing the server falls back to delivering the raw recording.
- **Audio capture** – the browser downsamples microphone audio to 24 kHz PCM16 and includes capture timestamps with every chunk. Avoid muting/pausing the tab mid-session to keep timing accurate.
- **AI playback telemetry** – when the AI interviewer speaks, the client sends an `ai_chunk_played` message with the scheduled playback time. The backend rewrites AI chunk timestamps using that signal before mixing.
- **Storage** – per-interview audio is stored under `backend/uploads/audio`, and the final MP4 export is written to `backend/uploads/videos`. These directories are created automatically.

## Testing the Voice Interview Feature

1. Create or select a candidate in the dashboard and launch a realtime interview.
2. Grant microphone and camera access in the interview client.
3. Converse with the AI interviewer; watch backend logs for `tts_chunk` and `ai_chunk_played` lines to confirm streaming.
4. When the session ends, open the admin “View Results” page and play the MP4. Audio should be in sync with the video; if not, review the troubleshooting section below.

For a deeper technical walkthrough see [REALTIME_INTERVIEW_README.md](./REALTIME_INTERVIEW_README.md).

## Troubleshooting

### MongoDB Connection Issues
- **Error: `Connection refused` or `ServerSelectionTimeoutError`**
  - Ensure MongoDB is running on your system
  - For local MongoDB: Start MongoDB with `mongod` or `brew services start mongodb-community` (macOS)
  - For cloud MongoDB (Atlas): Verify your connection string in `.env` and check network access settings
  - Verify the `MONGO_URL` in your `.env` file is correct
  - **Important**: The application has no fallback mechanism and requires MongoDB to be running

### Audio Not Playing
- Confirm the browser tab has audio permissions.
- Verify the OpenAI API key is configured correctly in the backend `.env`.
- Inspect browser devtools for `tts_chunk` payloads; if they are missing, ensure the realtime WebSocket is connected and the OpenAI Realtime model name matches `settings`.

### Microphone Not Working
- Ensure your browser has microphone permissions and is using the expected input device.
- Refresh the page after granting permissions; some browsers require a second attempt.
- Confirm `MediaRecorder` is supported (Safari requires HTTPS). When in doubt, test in the latest Chrome.

### Backend Connection Issues
- Verify the backend is running on port 8000 (or adjust the frontend `.env` values).
- Ensure `REACT_APP_BACKEND_URL` in both frontends points to the correct origin.
- If CORS errors appear, add your frontend origins to the `CORS_ORIGINS` list in the backend configuration.

### Audio & Video Out of Sync
- Make sure both frontends are using the latest code that emits `ai_chunk_played` telemetry.
- Check backend logs for lines like `Updated AI chunk timestamp`; absence indicates timestamps are not being received.
- Confirm FFmpeg is installed and executable (`ffmpeg -version`).
- Encourage candidates to wear headphones when possible to avoid microphone bleed-through of the AI voice, which can still create faint echoes in the mix.
