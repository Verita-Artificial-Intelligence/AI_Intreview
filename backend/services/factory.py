"""
Service factory for creating real or mock service instances.

Based on configuration flags, this factory returns either real API service
implementations or mock implementations for cost-free development/testing.
"""

import logging

from config import settings

logger = logging.getLogger(__name__)


def get_realtime_service(
    api_key: str,
    model: str,
    voice: str,
    instructions: str,
):
    """
    Get OpenAI Realtime service (real or mock based on configuration).

    Args:
        api_key: OpenAI API key
        model: Model name (e.g., gpt-4o-realtime-preview-2024-12-17)
        voice: Voice for TTS (alloy, echo, fable, onyx, nova, shimmer)
        instructions: System instructions

    Returns:
        RealtimeService or MockRealtimeService instance
    """
    if settings.MOCK_OPENAI_REALTIME:
        from services.mock_realtime_service import MockRealtimeService
        logger.info("[MOCK] Using MOCK OpenAI Realtime Service (no API calls, no costs)")
        return MockRealtimeService(api_key, model, voice, instructions)
    else:
        from services.realtime_service import RealtimeService
        logger.info("[REAL] Using REAL OpenAI Realtime Service (API calls enabled)")
        return RealtimeService(api_key, model, voice, instructions)
