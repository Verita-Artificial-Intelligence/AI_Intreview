# Verita AI Interview Platform

A comprehensive AI-powered interview platform featuring separate applications for interviewers and interview candidates.

## Project Overview

This platform consists of three main components:

- **Backend API**: FastAPI server handling interviews, audio processing, and AI interactions
- **Dashboard Frontend** (`dashboard-frontend`): Interview management interface for interviewers/administrators
- **Interview Frontend** (`interview-frontend`): Candidate-facing interview application

## Key Features

- AI-powered, voice-first interview automation with OpenAI Realtime
- Real-time transcription and response generation, streamed over WebSockets
- Automatic server-side audio mixing with frame-accurate timestamp alignment for export-ready MP4s
- Interview scheduling, candidate management, and analytics in the dashboard
- Interactive candidate experience with live AI interviewer, video capture, and synced recording playback
- MongoDB-backed persistence with media assets stored locally in `backend/uploads`

## Frontend Applications

### Dashboard Frontend (`dashboard-frontend`)
**For: Interviewers and Administrators**

Used to:
- Create and manage candidates
- Schedule and monitor interviews
- Review interview results and analytics
- Configure interview questions and AI personas

### Interview Frontend (`interview-frontend`)
**For: Interview Candidates**

Used to:
- Participate in scheduled interviews
- Record and respond to interview questions
- Receive AI-generated questions with audio
- Submit completed interviews

## Prerequisites

- Python 3.10+ (matching `pyproject` runtime expectations)
- Node.js 18+ (for modern Vite/CRA features and WebRTC APIs)
- MongoDB (local or cloud instance) — **required**
- OpenAI API key with access to the Realtime API
- FFmpeg installed and available on `PATH` (for muxing mixed audio into MP4 exports)

## Quick Start

Refer to [SETUP.md](./SETUP.md) for detailed setup instructions for:
- Backend configuration
- Dashboard Frontend setup
- Interview Frontend setup

## Project Structure

```
.
├── backend/                 # FastAPI backend server
│   ├── app.py             # Main application
│   ├── config.py          # Configuration management
│   ├── database.py        # Database setup
│   ├── models/            # Data models
│   ├── routers/           # API route handlers
│   ├── services/          # Business logic
│   ├── prompts/           # AI prompt templates
│   └── requirements.txt   # Python dependencies
├── dashboard-frontend/    # Interviewer/admin interface
├── interview-frontend/    # Candidate interview interface
└── README.md             # This file
```

## Recording & Media Pipeline

1. The browser captures microphone audio at 48 kHz, downsamples to 24 kHz PCM16, and streams chunks with capture timestamps to the backend.
2. OpenAI Realtime responses are streamed back to the client and scheduled via the Web Audio API; the actual playback time for each chunk is reported to the server.
3. The backend buffers both streams, aligning them on the capture/playback timeline before mixing into WAV files.
4. Once the candidate stops recording, the server combines the uploaded WebM video with the mixed audio using FFmpeg and publishes the final MP4 to `backend/uploads/videos`.

See [REALTIME_INTERVIEW_README.md](./REALTIME_INTERVIEW_README.md) for a detailed walkthrough of the realtime session flow.

## Troubleshooting & Operational Notes

- Detailed setup, environment configuration, and API usage are documented in [SETUP.md](./SETUP.md).
- Realtime interview internals, latency instrumentation, and media export behaviour are covered in [REALTIME_INTERVIEW_README.md](./REALTIME_INTERVIEW_README.md).
- For UI guidelines shared between web apps, refer to [`docs/design-system.md`](./docs/design-system.md).

## License

[Add license information here]
