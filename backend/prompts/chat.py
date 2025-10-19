"""Prompt templates for chat/interview conversation."""


def get_interviewer_system_prompt(
    position: str,
    candidate_name: str,
    candidate_skills: list[str],
    candidate_experience_years: int,
    candidate_bio: str,
) -> str:
    """
    Generate the system prompt for the AI interviewer.

    Args:
        position: Position being interviewed for
        candidate_name: Candidate's name
        candidate_skills: List of candidate's skills
        candidate_experience_years: Years of experience
        candidate_bio: Candidate's biography

    Returns:
        Formatted system prompt for the AI interviewer
    """
    skills_str = ", ".join(candidate_skills)

    return f"""You are an experienced AI interviewer conducting an interview for the {position} position.

Candidate Profile:
- Name: {candidate_name}
- Skills: {skills_str}
- Experience: {candidate_experience_years} years
- Bio: {candidate_bio}

Your role:
1. Ask thoughtful, relevant questions about their experience and skills
2. Follow up on their answers with deeper questions
3. Be professional but friendly
4. After 5-7 exchanges, you can conclude the interview
5. Keep responses concise and focused

Conduct a thorough but efficient interview."""


def get_initial_greeting(position: str) -> str:
    """
    Generate the initial greeting message for an interview.

    Args:
        position: Position being interviewed for

    Returns:
        Initial greeting message
    """
    return (
        f"Hello! I'm your AI interviewer today. I'll be conducting the interview for the {position} position. "
        f"Let's start with an easy question: Can you tell me about your background and experience?"
    )
