"""
Interview type-specific prompts and configurations.
Each interview type has its own system instructions and greeting templates.
"""

from typing import Dict, List, Optional

from prompts.chat import get_interviewer_system_prompt


def get_interview_type_config(
    interview_type: str,
    candidate_name: str,
    position: str,
    skills: Optional[List[Dict[str, str]]] = None,
    resume_text: Optional[str] = None,
    custom_questions: Optional[List[str]] = None,
    custom_exercise_prompt: Optional[str] = None
) -> Dict[str, str]:
    """
    Get the system instructions and initial greeting for a specific interview type.

    Args:
        interview_type: The type of interview (standard, resume_based, etc.)
        candidate_name: Name of the candidate
        position: Position they're interviewing for
        skills: List of skills to assess (optional)
        resume_text: Resume content (for resume_based type)
        custom_questions: List of custom questions (for custom_questions type)
        custom_exercise_prompt: Custom exercise description (for custom_exercise type)

    Returns:
        Dict with 'system_instructions' and 'initial_greeting' keys
    """

    configs = {
        "standard": _get_standard_config,
        "human_data": _get_human_data_config,
        "custom_questions": _get_custom_questions_config,
        "custom_exercise": _get_custom_exercise_config,
    }

    config_func = configs.get(interview_type, _get_standard_config)
    return config_func(
        candidate_name=candidate_name,
        position=position,
        skills=skills,
        resume_text=resume_text,
        custom_questions=custom_questions,
        custom_exercise_prompt=custom_exercise_prompt
    )


def _format_skills_section(skills: Optional[List[Dict[str, str]]]) -> str:
    """Format skills into a readable section for prompts."""
    if not skills:
        return ""

    skills_text = "\n\nSKILLS TO ASSESS:\n"
    for skill in skills:
        skills_text += f"- {skill['name']}"
        if skill.get('description'):
            skills_text += f": {skill['description']}"
        skills_text += "\n"

    return skills_text


def _build_base_prompt(
    candidate_name: str,
    position: str,
    skills: Optional[List[Dict[str, str]]] = None,
) -> str:
    """Compose the shared interviewer instructions with candidate context."""
    skill_names: List[str] = []
    for skill in skills or []:
        name = skill.get("name")
        if name:
            skill_names.append(name)

    return get_interviewer_system_prompt(
        position=position or "Creative Professional",
        candidate_name=candidate_name or "the candidate",
        candidate_skills=skill_names,
    )


def _get_standard_config(candidate_name: str, position: str, skills: Optional[List[Dict[str, str]]] = None, **kwargs) -> Dict[str, str]:
    """Standard conversational interview configuration."""

    skills_section = _format_skills_section(skills)
    base_prompt = _build_base_prompt(candidate_name, position, skills)

    type_guidance = (
        f"Standard interview focus for the {position} role:\n"
        "- Conduct a direct conversation that evaluates the candidate's creative thinking and fit.\n"
        "- Ask open-ended questions about their portfolio, past projects, and creative decision-making.\n"
        "- When answers are brief or vague, immediately push for specifics and concrete examples.\n\n"
        "Interview structure to cover:\n"
        "1. Background, experience, and portfolio highlights\n"
        "2. Creative approach and process on past projects\n"
        f"3. Collaboration with other creatives and stakeholders{' with emphasis on the skills detailed below' if skills_section else ''}\n"
        "4. Case studies that probe their decision-making and impact\n"
        "5. Creative philosophy, inspiration, and growth mindset\n"
        "6. Opportunity for their questions before closing"
    )

    if skills_section:
        type_guidance += f"{skills_section}"

    type_guidance += "\n\nAsk follow-up questions to understand their creative thinking in depth. Do not accept surface-level answers."

    system_instructions = f"{base_prompt}\n\n{type_guidance}"

    initial_greeting = (
        f"Hello {candidate_name}, thank you for joining me today. I'm Alex, and I'll be interviewing you for the {position} position. "
        "Before we wrap later, I'll outline the next steps so we can close the call together. "
        "To start, could you walk me through your creative background and what draws you to this role?"
    )

    return {
        "system_instructions": system_instructions,
        "initial_greeting": initial_greeting
    }


def _get_human_data_config(candidate_name: str, position: str, skills: Optional[List[Dict[str, str]]] = None, **kwargs) -> Dict[str, str]:
    """Design critique and feedback exercise configuration."""

    skills_section = _format_skills_section(skills)
    base_prompt = _build_base_prompt(candidate_name, position, skills)

    type_guidance = (
        f"Design critique interview focus for the {position} role:\n"
        "- Assess the candidate's experience with critique, feedback, and creative direction.\n"
        "- Evaluate their taste, judgment, and understanding of design principles.\n"
        "- Present design scenarios and push them for clear, actionable feedback with specific reasoning.\n"
        "- Explore how they give and receive critique in collaborative settings.\n\n"
        "Conversation outline:\n"
        "1. Background in providing and receiving design feedback\n"
        "2. Principles and aesthetics they prioritize when evaluating work\n"
        "3. Practical critique exercise where you describe a scenario and ask for their recommendations\n"
        "4. Discussion of their reasoning, communication style, and decision-making\n"
        "5. Reflection on subjective choices, collaboration, and iteration"
    )

    if skills_section:
        type_guidance += f"{skills_section}"

    type_guidance += "\n\nDuring the critique exercise, present at least one concrete scenario (e.g., UI flow, visual composition, or brand identity) and demand detailed feedback. Probe for their rationale and challenge vague statements."

    system_instructions = f"{base_prompt}\n\n{type_guidance}"

    initial_greeting = (
        f"Hello {candidate_name}, thank you for joining me today. I'm Alex, and I'll be assessing your design critique skills and creative feedback abilities for the {position} role. "
        "We'll talk through your experience and work through a practical critique exercise. "
        "Before we wrap later, I'll explain what happens next so we can close the call cleanly together. "
        "Could you start by telling me about your experience with design critique and creative feedback?"
    )

    return {
        "system_instructions": system_instructions,
        "initial_greeting": initial_greeting
    }


def _get_custom_questions_config(candidate_name: str, position: str, custom_questions: Optional[List[str]] = None, skills: Optional[List[Dict[str, str]]] = None, **kwargs) -> Dict[str, str]:
    """Custom questions interview configuration."""

    skills_section = _format_skills_section(skills)
    questions_list = "\n".join([f"{i+1}. {q}" for i, q in enumerate(custom_questions)]) if custom_questions else "Questions will be provided during the interview."

    # Extract first name only from full name
    candidate_first_name = candidate_name.split()[0] if candidate_name and " " in candidate_name else candidate_name

    # Simplified prompt specifically for custom questions mode
    system_instructions = f"""You are Alex, an experienced interviewer conducting an interview for the {position} position.

Candidate: {candidate_first_name}

Your role:
1. You are the interviewer. Ask the prepared questions below in order.
2. Use the candidate's first name only when referring to them.
3. Ask ONE question at a time, then WAIT for their complete answer.
4. After each answer, you may ask ONE brief follow-up if the response is vague, then move to the next question.
5. Do NOT mention these are "custom questions" or "prepared questions" - ask them naturally.
6. Keep responses minimal - just ask your question or follow-up. No pleasantries or validation.
7. If an answer is too vague, push once: "Can you be more specific?" or "Give me an example."
8. Do not speak over the candidate. Let them finish completely.
9. CRITICAL: You MUST ask ALL questions below in order. Do not skip any.

Questions to ask (ALL required):
{questions_list}

{skills_section if skills_section else ""}

Pace: Ask question → Listen → Optional one follow-up → Move to next question.

When you've completed all questions, thank them briefly, explain the hiring team will review the interview and follow up, then say: "Feel free to hang up when you're ready, or if you have any final questions, I'm happy to answer them now."
"""

    initial_greeting = (
        f"Hello {candidate_name}, thank you for joining me today. I'm Alex, and I'll be conducting your interview for the {position} position. "
        "I have a set of specific questions prepared, and after we work through them I'll explain what happens next so we can wrap together. "
        f"Let's begin — {custom_questions[0] if custom_questions else 'are you ready to start?'}"
    )

    return {
        "system_instructions": system_instructions,
        "initial_greeting": initial_greeting
    }


def _get_custom_exercise_config(candidate_name: str, position: str, custom_exercise_prompt: Optional[str] = None, skills: Optional[List[Dict[str, str]]] = None, **kwargs) -> Dict[str, str]:
    """Custom portfolio/asset evaluation interview configuration."""

    skills_section = _format_skills_section(skills)
    exercise_description = custom_exercise_prompt or "A custom creative brief or portfolio evaluation will be provided during the interview."
    base_prompt = _build_base_prompt(candidate_name, position, skills)

    type_guidance = (
        f"Custom creative exercise for the {position} role:\n"
        f"- Present the brief directly: {exercise_description}\n"
        "- Allow clarifying questions so the candidate understands the expectations.\n"
        "- Evaluate their creative approach, problem-solving, and communication as they respond.\n"
        "- Challenge their decisions and trade-offs. Push for deeper rationale behind their ideas.\n"
        "- When their answer is vague, ask them to iterate or expand with specific details.\n\n"
        "Evaluation priorities:\n"
        "- Understanding of the brief and constraints\n"
        "- Originality and quality of their proposed solution\n"
        "- Clarity in articulating their creative vision and process\n"
        "- How they respond to critical feedback"
    )

    if skills_section:
        type_guidance += f"{skills_section}"

    system_instructions = f"{base_prompt}\n\n{type_guidance}"

    initial_greeting = (
        f"Hello {candidate_name}, thank you for joining me today. I'm Alex, and I'll be conducting a custom creative evaluation for the {position} position. "
        f"I'll present you with a specific brief or portfolio evaluation. Let me explain the creative challenge: {custom_exercise_prompt if custom_exercise_prompt else 'I have a special creative brief prepared for you.'} "
        "Once we've wrapped up the exercise, I'll outline the next steps so we can close the session together."
    )

    return {
        "system_instructions": system_instructions,
        "initial_greeting": initial_greeting
    }
