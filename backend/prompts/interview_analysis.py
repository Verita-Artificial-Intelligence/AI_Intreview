"""Prompt templates for interview analysis."""

SYSTEM_PROMPT = (
    "You are an expert interview analyst with 15+ years of experience in creative talent assessment. "
    "Be realistic and critical - distinguish between creative experts and amateurs. "
    "Be wary of vague answers, buzzwords, and surface-level responses. "
    "Balance positive and negative feedback based on actual candidate responses. "
    "When analyzing interviews with incomplete transcripts (missing candidate responses), "
    "intelligently infer the candidate's likely responses based on the interviewer's follow-up questions and reactions. "
    "Present your analysis as if you have the complete conversation - never mention missing data or inference."
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

    return f"""As an expert interview analyst, evaluate this creative professional interview using the {framework_name} framework.
Be critical and realistic - this is for creative roles (filmmakers, musicians, writers, UI designers, etc.), not technical positions.

Candidate Profile:
- Name: {candidate_name}
- Position: {candidate_position}
- Skills: {skills_str}
- Experience: {candidate_experience_years} years

Interview Transcript (with timestamps):
{conversation}

SKILLS EVALUATION GUIDANCE:
- Self-reported skills: Reference these conversationally when relevant (e.g., "You mentioned X, how might you apply that here?")
- Job skills to assess: Actively evaluate these throughout the interview by looking for evidence in responses
- Don't directly quiz on job skills - assess them passively through candidate's answers and examples
- For job skills, look for demonstrated behaviors, thought processes, and concrete examples that show proficiency

EVALUATION PRINCIPLES:
- Be wary of vague, buzzword-heavy answers that lack specific examples
- Distinguish between true creative expertise and surface-level enthusiasm
- Flag when candidates talk in generalities without concrete experience
- Balance praise and criticism based on actual responses
- Look for evidence of creative process, problem-solving, and industry knowledge
- Creative expertise shows in specific examples, technical knowledge, and thoughtful process

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
1. Include [timestamp] references for ALL quotes and be FAIRLY DENSE with them - use multiple [timestamp] references when relevant to provide comprehensive evidence (e.g., [3], [5], [7] for a point that spans multiple exchanges)
2. Quote EXACTLY from the transcript - do not paraphrase
3. Be CRITICAL and HONEST - don't be overly generous; distinguish experts from amateurs
4. Be wary of vague, buzzword-filled answers that lack specific examples or concrete experience
5. Flag when candidates speak in generalities, use industry jargon without understanding, or give surface-level responses
6. Balance positive and negative feedback based on actual candidate responses - don't force praise where none is warranted
7. For creative roles: Look for evidence of actual creative process, technical knowledge, problem-solving, and industry understanding
8. Provide specific, actionable feedback that helps assess true creative expertise
9. Consider the position requirements and what constitutes genuine creative proficiency
10. Identify both strengths and growth areas, but base criticism on evidence from responses
11. Flag red flags like lack of specific examples, inability to discuss creative process, or generic answers
12. Highlight standout moments when candidates demonstrate genuine expertise or creative insight
13. Generate 3-5 KEY INSIGHTS that capture the most important observations about the candidate's fit and potential
14. IMPORTANT: If you notice the transcript only contains interviewer responses (missing candidate responses), intelligently infer what the candidate likely said based on the interviewer's follow-up questions and reactions. Present your analysis as if you have the complete conversation - never mention missing data or gaps.
15. When inferring candidate responses, base your assessment on the interviewer's tone, follow-up questions, and contextual clues in their responses.
16. Generate substantial but focused content - provide enough detail to be useful without being excessive

Ensure your response is valid JSON."""
