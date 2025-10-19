"""
Mock OpenAI Realtime API service for development and testing.

This mock simulates the OpenAI Realtime API without making actual API calls,
allowing for cost-free development and deterministic testing.
"""

import asyncio
import logging
import random
from typing import AsyncIterator, Optional, Dict, Any, List

logger = logging.getLogger(__name__)


# Pre-canned interview questions
INTERVIEW_QUESTIONS = [
    "Tell me about your professional background and experience.",
    "Can you describe a challenging project you've worked on recently?",
    "How do you approach problem-solving in your work?",
    "What interests you most about this position?",
    "Tell me about a time when you had to work with a difficult team member.",
    "How do you stay current with new technologies and industry trends?",
    "Can you walk me through your typical development workflow?",
    "Describe a situation where you had to meet a tight deadline.",
    "What's your experience with agile methodologies?",
    "How do you handle code reviews and feedback?",
    "Tell me about a time you had to debug a particularly difficult issue.",
    "What's your approach to writing maintainable code?",
    "How do you prioritize tasks when working on multiple projects?",
    "Can you describe your experience with testing and quality assurance?",
    "What motivates you in your career?",
]


class MockRealtimeService:
    """
    Mock implementation of OpenAI Realtime API service.

    Simulates realistic behavior including:
    - Connection lifecycle
    - Voice Activity Detection (VAD) events
    - Streaming text responses
    - All required event types
    - Realistic timing delays
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-realtime",
        voice: str = "alloy",
        instructions: str = "",
    ):
        """
        Initialize Mock Realtime API service.

        Args:
            api_key: OpenAI API key (not used in mock)
            model: Model name (not used in mock)
            voice: Voice for TTS (not used in mock)
            instructions: System instructions (used for context)
        """
        self.api_key = api_key
        self.model = model
        self.voice = voice
        self.instructions = instructions
        self.connected = False
        self.session_id: Optional[str] = None
        self._event_queue: asyncio.Queue = asyncio.Queue()
        self._receive_task: Optional[asyncio.Task] = None

        # Conversation state
        self._question_index = 0
        self._turn_count = 0
        self._is_listening = False
        self._audio_buffer_size = 0

    async def connect(self) -> None:
        """Simulate WebSocket connection to OpenAI Realtime API."""
        try:
            logger.info(f"[MOCK] Connecting to OpenAI Realtime API (model: {self.model})")

            # Simulate connection delay
            await asyncio.sleep(0.2)

            self.connected = True
            self.session_id = f"mock-session-{random.randint(1000, 9999)}"

            logger.info(f"[MOCK] Connected to OpenAI Realtime API (session: {self.session_id})")

            # Start event simulation loop
            self._receive_task = asyncio.create_task(self._simulate_events())

            # Emit session.updated event
            await self._emit_event({
                "type": "session.updated",
                "session": {
                    "id": self.session_id,
                    "model": self.model,
                }
            })

        except Exception as e:
            logger.error(f"[MOCK] Failed to connect: {e}")
            self.connected = False
            raise

    async def _simulate_events(self) -> None:
        """Background task to simulate realistic event flow."""
        try:
            # Auto-ask first question after a short delay
            await asyncio.sleep(1.5)
            if self.connected and self._question_index == 0:
                logger.info("[MOCK] Auto-asking first interview question")
                await self.create_response()

            while self.connected:
                await asyncio.sleep(0.1)  # Event loop heartbeat
        except asyncio.CancelledError:
            pass

    async def _emit_event(self, event: Dict[str, Any]) -> None:
        """Emit an event to the event queue."""
        await self._event_queue.put(event)
        logger.debug(f"[MOCK] Emitted event: {event.get('type')}")

    async def append_audio(self, audio_b64: str) -> None:
        """
        Simulate receiving audio chunk.

        Args:
            audio_b64: Base64-encoded PCM16 audio (not processed in mock)
        """
        if not self.connected:
            raise RuntimeError("Mock WebSocket not connected")

        # Track audio buffer size
        self._audio_buffer_size += len(audio_b64)

        # Simulate VAD: emit speech_started on first chunk
        if not self._is_listening and self._audio_buffer_size > 1000:
            self._is_listening = True
            await self._emit_event({
                "type": "input_audio_buffer.speech_started",
                "audio_start_ms": 0
            })

    async def commit_audio(self) -> None:
        """Simulate committing the audio buffer."""
        if not self.connected:
            raise RuntimeError("Mock WebSocket not connected")

        # Emit committed event
        await self._emit_event({
            "type": "input_audio_buffer.committed"
        })

        # Simulate VAD: emit speech_stopped
        if self._is_listening:
            await asyncio.sleep(0.1)  # Small delay
            await self._emit_event({
                "type": "input_audio_buffer.speech_stopped",
                "audio_end_ms": self._audio_buffer_size // 10  # Rough estimate
            })
            self._is_listening = False

        # Simulate transcription after speech stops
        await asyncio.sleep(0.2)  # Simulate transcription delay
        transcript = self._generate_user_transcript()

        await self._emit_event({
            "type": "conversation.item.input_audio_transcription.completed",
            "transcript": transcript,
            "item_id": f"item-{self._turn_count}"
        })

        # Reset audio buffer
        self._audio_buffer_size = 0

    async def create_response(self) -> None:
        """Simulate AI response generation."""
        if not self.connected:
            raise RuntimeError("Mock WebSocket not connected")

        # Emit response.created
        await self._emit_event({
            "type": "response.created",
            "response": {
                "id": f"resp-{self._turn_count}"
            }
        })

        # Simulate thinking time
        await asyncio.sleep(random.uniform(0.3, 0.6))

        # Get AI response text
        response_text = self._get_next_question()

        # Stream text in chunks (simulate streaming)
        chunk_size = random.randint(8, 15)
        words = response_text.split()

        for i in range(0, len(words), chunk_size):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)

            # Add space before chunk if not first
            if i > 0:
                chunk_text = " " + chunk_text

            await asyncio.sleep(random.uniform(0.1, 0.2))  # Simulate streaming delay

            await self._emit_event({
                "type": "response.output_text.delta",
                "delta": chunk_text,
                "response_id": f"resp-{self._turn_count}"
            })

        # Emit text.done
        await self._emit_event({
            "type": "response.output_text.done",
            "text": response_text,
            "response_id": f"resp-{self._turn_count}"
        })

        # Emit response.done
        await self._emit_event({
            "type": "response.done",
            "response": {
                "id": f"resp-{self._turn_count}",
                "status": "completed"
            }
        })

        self._turn_count += 1

    async def cancel_response(self) -> None:
        """Simulate canceling ongoing response (for interruptions)."""
        logger.info("[MOCK] Response cancelled (barge-in)")

        await self._emit_event({
            "type": "response.cancelled",
            "response_id": f"resp-{self._turn_count}"
        })

    async def aiter_events(self) -> AsyncIterator[Dict[str, Any]]:
        """
        Async iterator over events from mock Realtime API.

        Yields:
            Event dictionaries matching OpenAI Realtime API format
        """
        while self.connected or not self._event_queue.empty():
            try:
                event = await asyncio.wait_for(
                    self._event_queue.get(), timeout=0.1
                )
                yield event
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"[MOCK] Error iterating events: {e}")
                break

    def _generate_user_transcript(self) -> str:
        """Generate realistic user transcript based on question."""
        responses = [
            "I have about 5 years of experience in software development, primarily working with Python and JavaScript.",
            "In my most recent project, I worked on building a microservices architecture for an e-commerce platform.",
            "I typically start by breaking down the problem into smaller components and then tackle each one systematically.",
            "I'm really excited about the opportunity to work on cutting-edge technology and solve complex problems.",
            "I find that clear communication is key when working with difficult team members.",
            "I regularly read tech blogs, attend conferences, and contribute to open source projects.",
            "My workflow usually involves planning, implementation, testing, and code review.",
            "When facing tight deadlines, I prioritize the most critical features and communicate clearly with stakeholders.",
            "I've worked extensively with Scrum and Kanban methodologies over the past few years.",
            "I value constructive feedback and always try to learn from code reviews.",
            "I use a combination of debugging tools, logging, and systematic elimination to track down issues.",
            "I focus on writing clean, well-documented code with good test coverage.",
            "I use a combination of urgency and impact to prioritize my work.",
            "I'm a strong believer in TDD and have experience with various testing frameworks.",
            "I'm motivated by continuous learning and making a positive impact through technology.",
        ]

        # Return response matching current question
        index = min(self._question_index, len(responses) - 1)
        return responses[index]

    def _get_next_question(self) -> str:
        """Get next interview question."""
        question = INTERVIEW_QUESTIONS[self._question_index % len(INTERVIEW_QUESTIONS)]
        self._question_index += 1
        return question

    def get_text_from_event(self, event: Dict[str, Any]) -> Optional[str]:
        """
        Extract text content from event if present.

        Args:
            event: Event dictionary

        Returns:
            Text string or None
        """
        event_type = event.get("type", "")

        if event_type == "response.output_text.delta":
            return event.get("delta", "")

        if event_type == "response.output_text.done":
            return event.get("text", "")

        if event_type == "conversation.item.input_audio_transcription.completed":
            return event.get("transcript", "")

        return None

    def is_speech_started(self, event: Dict[str, Any]) -> bool:
        """Check if event signals user started speaking."""
        return event.get("type") == "input_audio_buffer.speech_started"

    def is_speech_stopped(self, event: Dict[str, Any]) -> bool:
        """Check if event signals user stopped speaking."""
        return event.get("type") == "input_audio_buffer.speech_stopped"

    def is_response_created(self, event: Dict[str, Any]) -> bool:
        """Check if event signals response generation started."""
        return event.get("type") == "response.created"

    def is_response_text_delta(self, event: Dict[str, Any]) -> bool:
        """Check if event contains streaming text."""
        return event.get("type") == "response.output_text.delta"

    def is_response_text_done(self, event: Dict[str, Any]) -> bool:
        """Check if event signals text generation complete."""
        return event.get("type") == "response.output_text.done"

    def is_response_done(self, event: Dict[str, Any]) -> bool:
        """Check if event signals response fully complete."""
        return event.get("type") == "response.done"

    def is_error(self, event: Dict[str, Any]) -> bool:
        """Check if event is an error."""
        return event.get("type") == "error"

    def extract_sentences(self, text: str, buffer: str = "") -> List[str]:
        """
        Extract complete sentences from text for streaming to TTS.

        Args:
            text: New text to process
            buffer: Accumulated text buffer from previous calls

        Returns:
            List of complete sentences ready for TTS
        """
        combined = buffer + text
        sentences = []

        import re
        sentence_endings = re.split(r'([.!?]+)', combined)

        i = 0
        while i < len(sentence_endings) - 1:
            sentence = sentence_endings[i] + sentence_endings[i + 1]
            sentences.append(sentence.strip())
            i += 2

        return sentences

    async def close(self) -> None:
        """Close mock connection and cleanup."""
        self.connected = False

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        logger.info("[MOCK] OpenAI Realtime connection closed")
