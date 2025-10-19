# Verita AI Interview Platform

A comprehensive AI-powered interview platform featuring separate applications for interviewers and interview candidates.

## Project Overview

This platform consists of three main components:

- **Backend API**: FastAPI server handling interviews, audio processing, and AI interactions
- **Dashboard Frontend** (`dashboard-frontend`): Interview management interface for interviewers/administrators
- **Interview Frontend** (`interview-frontend`): Candidate-facing interview application

## Key Features

- AI-powered interview automation with voice capabilities
- Real-time transcription and response generation
- Interview scheduling and candidate management (Dashboard)
- Interactive audio interview experience (Interview)
- MongoDB-backed data persistence

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

- Python 3.9+
- Node.js 16+
- MongoDB (local or cloud instance) - REQUIRED
- OpenAI API Key

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

## API Documentation

See [SETUP.md](./SETUP.md) for API endpoints and usage examples.

## Troubleshooting

Common issues and solutions are documented in [SETUP.md](./SETUP.md).

## License

[Add license information here]
