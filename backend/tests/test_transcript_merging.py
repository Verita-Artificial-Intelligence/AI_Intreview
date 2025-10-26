import pytest

from backend.routers.websocket import _merge_transcript_chunk


@pytest.mark.parametrize(
    "chunks,final_text",
    [
        (["Hello", " there"], "Hello there"),
        (["", "Second chunk"], "Second chunk"),
    ],
)
def test_merge_transcript_chunk_replaces_on_final(chunks, final_text):
    transcript = []

    # Stream deltas first (non-final)
    for chunk in chunks:
        _merge_transcript_chunk(
            transcript,
            "user",
            chunk,
            final=False,
            replace_on_final=True,
        )

    # Final transcript should overwrite the current turn
    _merge_transcript_chunk(
        transcript,
        "user",
        final_text,
        final=True,
        replace_on_final=True,
    )

    assert len(transcript) == 1
    assert transcript[0]["speaker"] == "user"
    assert transcript[0]["text"] == final_text


def test_merge_transcript_chunk_handles_new_speakers():
    transcript = []
    _merge_transcript_chunk(
        transcript, "user", "Candidate speaks", final=True, replace_on_final=True
    )
    _merge_transcript_chunk(
        transcript, "assistant", "AI replies", final=False, replace_on_final=False
    )

    assert len(transcript) == 2
    assert transcript[0]["speaker"] == "user"
    assert transcript[1]["speaker"] == "assistant"


def test_merge_transcript_chunk_appends_non_final_user_delta():
    transcript = []
    _merge_transcript_chunk(
        transcript, "user", "Hello", final=False, replace_on_final=True
    )
    _merge_transcript_chunk(
        transcript, "user", " world", final=False, replace_on_final=True
    )

    assert transcript == [{"speaker": "user", "text": "Hello world"}]
