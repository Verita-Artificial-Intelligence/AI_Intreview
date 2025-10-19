"""Prompt templates for interview completion and summary generation."""

SUMMARY_SYSTEM_PROMPT = "You are an HR assistant analyzing interview transcripts."


def get_summary_prompt(conversation: str) -> str:
    """
    Generate the prompt for interview summary generation.

    Args:
        conversation: Full conversation transcript formatted as "role: content" lines

    Returns:
        Formatted prompt for generating interview summary
    """
    return (
        f"Based on this interview conversation, provide a brief summary of the candidate's performance, "
        f"strengths, and areas of concern. Keep it under 150 words.\n\n"
        f"Conversation:\n{conversation}"
    )
