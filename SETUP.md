# AI Interview Setup Guide

## Prerequisites

- Python 3.9+
- Node.js 16+
- **MongoDB (local or cloud instance)** - REQUIRED: The application requires a running MongoDB instance. There is no fallback mechanism.
- OpenAI API Key

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

5. Start the development server (typically on a different port):
```bash
yarn start --port 3001
# or
npm start -- --port 3001
```

The interview frontend will be available at `http://localhost:3001`

**Note**: Both frontends can run simultaneously on different ports during development.

## Key Changes Made

### Fixed AI Voice Breakdown Issues

1. **TTS Audio Generation Fix**: 
   - Fixed the `iter_bytes()` issue in the `/audio/tts` endpoint
   - Changed from `async for chunk in response.iter_bytes()` to `response.read()`
   - The OpenAI AsyncOpenAI client returns a response object that needs `.read()` to get the audio bytes

2. **Removed emergentintegrations Dependency**:
   - Replaced `emergentintegrations.llm.chat.LlmChat` with direct OpenAI API calls
   - Updated all chat endpoints (`/chat`, `/interviews/{id}/analyze`, `/interviews/{id}/complete`) to use OpenAI's chat completions API
   - This makes the application more maintainable and removes dependency on a proprietary package

3. **Environment Variable Updates**:
   - Changed from `EMERGENT_LLM_KEY` to `OPENAI_API_KEY` (with backward compatibility)
   - Added `.env.example` files for both backend and frontend

## Testing the Voice Interview Feature

1. Create a candidate from the dashboard
2. Start an audio interview
3. Click the microphone button to record your response
4. The system will:
   - Transcribe your audio using OpenAI Whisper (STT)
   - Generate an AI response using GPT-4o-mini
   - Convert the response to speech using OpenAI TTS (nova voice)
   - Play the audio automatically

## API Endpoints

### Audio Endpoints
- `POST /api/audio/tts` - Text-to-speech conversion
- `POST /api/audio/stt` - Speech-to-text transcription
- `GET /api/audio/voices` - Get available TTS voices
- `GET /api/audio/persona` - Get AI interviewer persona

### Interview Endpoints
- `POST /api/interviews` - Create a new interview
- `GET /api/interviews` - Get all interviews
- `GET /api/interviews/{id}` - Get specific interview
- `POST /api/interviews/{id}/complete` - Complete an interview
- `POST /api/interviews/{id}/analyze` - Analyze interview performance

### Chat Endpoints
- `POST /api/chat` - Send a message in an interview
- `GET /api/interviews/{id}/messages` - Get all messages for an interview

## Troubleshooting

### MongoDB Connection Issues
- **Error: `Connection refused` or `ServerSelectionTimeoutError`**
  - Ensure MongoDB is running on your system
  - For local MongoDB: Start MongoDB with `mongod` or `brew services start mongodb-community` (macOS)
  - For cloud MongoDB (Atlas): Verify your connection string in `.env` and check network access settings
  - Verify the `MONGO_URL` in your `.env` file is correct
  - **Important**: The application has no fallback mechanism and requires MongoDB to be running

### Audio Not Playing
- Check that your browser has audio permissions enabled
- Verify the OpenAI API key is correct in the backend `.env` file
- Check browser console for any errors

### Microphone Not Working
- Ensure your browser has microphone permissions
- Check that you have a working microphone connected
- Try refreshing the page and allowing permissions again

### Backend Connection Issues
- Verify the backend is running on port 8000
- Check that `REACT_APP_BACKEND_URL` in frontend `.env` points to the correct backend URL
- Ensure CORS is configured correctly in the backend
