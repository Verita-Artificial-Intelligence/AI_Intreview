from typing import Optional


def get_assignment_email_html(
    candidate_name: str,
    project_name: str,
    role: Optional[str],
    company_name: str,
    logo_url: str,
    support_email: str,
) -> str:
    """
    Generate HTML email for project assignment notification.

    Args:
        candidate_name: Name of the candidate
        project_name: Name of the project
        role: Optional role in the project
        company_name: Company name for branding
        logo_url: URL to company logo
        support_email: Support email address

    Returns:
        HTML email content
    """
    role_section = ""
    if role:
        role_section = f"""
        <p style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
            <strong>Your role:</strong> {role}
        </p>
        """

    logo_section = ""
    if logo_url:
        logo_section = f"""
        <img src="{logo_url}" alt="{company_name}" style="max-width: 200px; height: auto; margin-bottom: 20px;" />
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Project Assignment - {company_name}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 40px;">
                                {logo_section}
                                
                                <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                                    Congratulations! You've Been Assigned to a Project
                                </h1>
                                
                                <p style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                    Hi {candidate_name},
                                </p>
                                
                                <p style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                    We're excited to let you know that you've been assigned to <strong>{project_name}</strong>.
                                </p>
                                
                                {role_section}
                                
                                <p style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                    This is an important next step, and we look forward to your contributions. You can view more details about the project by logging into your account.
                                </p>
                                
                                <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td style="background-color: #2563eb; border-radius: 6px; padding: 14px 28px;">
                                            <a href="#" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; display: inline-block;">
                                                View Project Details
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />
                                
                                <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #666666;">
                                    If you have any questions, please reach out to us at <a href="mailto:{support_email}" style="color: #2563eb; text-decoration: none;">{support_email}</a>.
                                </p>
                                
                                <p style="margin: 20px 0 0 0; font-size: 14px; color: #666666;">
                                    Best regards,<br />
                                    The {company_name} Team
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <p style="margin: 20px 0; font-size: 12px; color: #999999; text-align: center;">
                        © {company_name}. All rights reserved.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    return html


def get_assignment_email_text(
    candidate_name: str,
    project_name: str,
    role: Optional[str],
    company_name: str,
    support_email: str,
) -> str:
    """
    Generate plain text email for project assignment notification.

    Args:
        candidate_name: Name of the candidate
        project_name: Name of the project
        role: Optional role in the project
        company_name: Company name for branding
        support_email: Support email address

    Returns:
        Plain text email content
    """
    role_text = ""
    if role:
        role_text = f"\n\nYour role: {role}"

    text = f"""
Congratulations! You've Been Assigned to a Project

Hi {candidate_name},

We're excited to let you know that you've been assigned to {project_name}.
{role_text}

This is an important next step, and we look forward to your contributions. You can view more details about the project by logging into your account.

If you have any questions, please reach out to us at {support_email}.

Best regards,
The {company_name} Team

---
© {company_name}. All rights reserved.
"""

    return text.strip()
