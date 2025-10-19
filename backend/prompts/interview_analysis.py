"""Prompt templates for interview analysis."""

SYSTEM_PROMPT = (
    "You are an expert interview analyst with 15+ years of experience in talent assessment. "
    "Provide thorough, evidence-based evaluations with specific examples."
)


def get_analysis_prompt(
    framework_name: str,
    candidate_name: str,
    candidate_position: str,
    candidate_skills: list[str],
    candidate_experience_years: int,
    conversation: str,
) -> str:
    """
    Generate the analysis prompt for interview evaluation.

    Args:
        framework_name: Name of the evaluation framework to use
        candidate_name: Candidate's full name
        candidate_position: Position being interviewed for
        candidate_skills: List of candidate's skills
        candidate_experience_years: Years of experience
        conversation: Full interview transcript with timestamps

    Returns:
        Formatted prompt string for AI analysis
    """
    skills_str = ", ".join(candidate_skills)

    return f"""As an expert interview analyst, evaluate this interview using the {framework_name} framework.

Candidate Profile:
- Name: {candidate_name}
- Position: {candidate_position}
- Skills: {skills_str}
- Experience: {candidate_experience_years} years

Interview Transcript (with timestamps):
{conversation}

Provide a comprehensive JSON assessment with:

{{
    "overall_score": 0-10 (decimal allowed),
    "overall_quality_score": 0-100 (percentage),
    "skills_breakdown": [
        {{
            "skill": "Skill Name",
            "score": 0-10,
            "level": "Beginner/Intermediate/Advanced/Expert",
            "evidence": "Direct quote from transcript with [timestamp]"
        }}
    ],
    "key_insights": [
        "Insight with supporting quote [timestamp]"
    ],
    "strengths": [
        "Strength with supporting quote [timestamp]"
    ],
    "areas_for_improvement": [
        "Area for improvement with context [timestamp]"
    ],
    "red_flags": [
        "Any concerning responses [timestamp]" (empty array if none)
    ],
    "standout_moments": [
        "Exceptional responses [timestamp]"
    ],
    "communication_assessment": {{
        "clarity_score": 0-10,
        "articulation_score": 0-10,
        "confidence_score": 0-10,
        "notes": "Brief assessment"
    }},
    "technical_depth": {{
        "score": 0-10,
        "notes": "Assessment of technical knowledge demonstrated"
    }},
    "problem_solving": {{
        "score": 0-10,
        "approach": "Description of problem-solving methodology shown",
        "example": "Quote demonstrating approach [timestamp]"
    }},
    "cultural_alignment": {{
        "score": 0-10,
        "values_match": "How well candidate aligns with values",
        "team_fit": "Potential team dynamics fit"
    }},
    "recommendation": "Strong Hire/Hire/Maybe/No Hire",
    "confidence": 0-100,
    "recommendations": [
        "Specific actionable recommendation"
    ],
    "next_steps": [
        "Suggested next steps for this candidate"
    ],
    "framework_specific_analysis": {{
        "key": "Framework-specific insights with [timestamps]"
    }}
}}

CRITICAL RULES:
1. Include [timestamp] references for ALL quotes (e.g., [3] for the 3rd message)
2. Quote EXACTLY from the transcript - do not paraphrase
3. Be objective and evidence-based
4. Provide specific, actionable feedback
5. Consider the position requirements
6. Identify both strengths and growth areas
7. Flag any red flags clearly
8. Highlight standout moments

Ensure your response is valid JSON."""
