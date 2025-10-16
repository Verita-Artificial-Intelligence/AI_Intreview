import base64
import importlib
import os
import sys
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient


class FakeCursor:
    def __init__(self, documents):
        self._documents = documents

    def sort(self, key, direction):
        reverse = direction < 0
        self._documents.sort(key=lambda doc: doc.get(key), reverse=reverse)
        return self

    async def to_list(self, length):
        return self._documents[:length]


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = [dict(doc) for doc in (documents or [])]

    async def insert_one(self, document):
        self.documents.append(dict(document))

    async def find_one(self, query, projection=None):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return dict(document)
        return None

    def find(self, query, projection=None):
        if not query:
            matched = [dict(doc) for doc in self.documents]
        else:
            matched = [dict(doc) for doc in self.documents if all(doc.get(key) == value for key, value in query.items())]
        return FakeCursor(matched)

    async def update_one(self, query, update):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                for update_key, update_value in update.get("$set", {}).items():
                    document[update_key] = update_value
                return


class FakeDB:
    def __init__(self):
        now = datetime(2025, 10, 16, 12, 0, 0, tzinfo=timezone.utc).isoformat()
        candidate_id = "candidate-1"
        interview_id = "interview-1"

        self.candidates = FakeCollection([
            {
                "id": candidate_id,
                "name": "Alex Test",
                "email": "alex@example.com",
                "skills": ["JavaScript", "React"],
                "experience_years": 5,
                "position": "Frontend Engineer",
                "bio": "Seasoned frontend developer.",
                "created_at": now,
            }
        ])

        self.interviews = FakeCollection([
            {
                "id": interview_id,
                "candidate_id": candidate_id,
                "candidate_name": "Alex Test",
                "position": "Frontend Engineer",
                "status": "in_progress",
                "created_at": now,
            }
        ])

        self.messages = FakeCollection([
            {
                "id": "msg-1",
                "interview_id": interview_id,
                "role": "assistant",
                "content": "Welcome to the interview!",
                "timestamp": now,
            }
        ])


class FakeResponse:
    def __init__(self, payload: bytes):
        self._payload = payload

    async def iter_bytes(self):
        yield self._payload


class FakeSpeech:
    async def create(self, *args, **kwargs):
        return FakeResponse(b"fake audio bytes")


class FakeTranscriptions:
    async def create(self, *args, **kwargs):
        return "stub transcription"


class FakeAudio:
    def __init__(self):
        self.speech = FakeSpeech()
        self.transcriptions = FakeTranscriptions()


class FakeOpenAI:
    def __init__(self):
        self.audio = FakeAudio()


class FakeMongoClient:
    def __init__(self, fake_db):
        self._db = fake_db

    def __getitem__(self, name):
        return self._db

    def close(self):
        pass


@pytest.fixture()
def api_client(monkeypatch):
    fake_db = FakeDB()

    monkeypatch.setenv("MONGO_URL", "mongodb://stub")
    monkeypatch.setenv("DB_NAME", "ai_test")
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("EMERGENT_LLM_KEY", "fake-key")

    def fake_client_factory(*args, **kwargs):
        return FakeMongoClient(fake_db)

    monkeypatch.setattr("motor.motor_asyncio.AsyncIOMotorClient", fake_client_factory, raising=False)

    if "backend.server" in sys.modules:
        del sys.modules["backend.server"]

    server = importlib.import_module("backend.server")
    server.db = fake_db
    server.client = FakeMongoClient(fake_db)
    server.openai_client = FakeOpenAI()

    return TestClient(server.app), fake_db


def test_get_persona(api_client):
    client, _ = api_client
    response = client.get("/api/audio/persona")
    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "Dr. Sarah Chen"
    assert payload["voice"] == "nova"


def test_generate_tts_uses_stubbed_audio(api_client):
    client, _ = api_client
    response = client.post("/api/audio/tts", json={"text": "Hello"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["voice_id"] == "nova"
    assert payload["text"] == "Hello"
    assert payload["audio_url"].startswith("data:audio/mpeg;base64,")

    encoded = payload["audio_url"].split(",", 1)[1]
    assert base64.b64decode(encoded) == b"fake audio bytes"


def test_transcribe_audio_returns_stubbed_text(api_client):
    client, _ = api_client
    files = {"audio_file": ("recording.webm", b"binary", "audio/webm")}
    response = client.post("/api/audio/stt", files=files)
    assert response.status_code == 200
    payload = response.json()
    assert payload["transcribed_text"] == "stub transcription"
    assert payload["filename"] == "recording.webm"


def test_chat_flow_appends_messages(api_client):
    client, fake_db = api_client
    interview_id = fake_db.interviews.documents[0]["id"]
    initial_message_count = len(fake_db.messages.documents)

    response = client.post(
        "/api/chat",
        json={"interview_id": interview_id, "message": "How are you?"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["message"].startswith("[Test Mode] AI response stub")

    assert len(fake_db.messages.documents) == initial_message_count + 2
    roles = [doc["role"] for doc in fake_db.messages.documents[-2:]]
    assert roles == ["user", "assistant"]

