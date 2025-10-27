import boto3
from botocore.exceptions import ClientError, BotoCoreError
from typing import Optional
from config import settings
from models import Assignment, EmailSend
from repositories import (
    EmailSendRepository,
    ProjectRepository,
    CandidateRepository,
)
from services.email_templates import (
    get_assignment_email_html,
    get_assignment_email_text,
)
from utils import prepare_for_mongo
from datetime import datetime, timezone
import logging
import time
import uuid

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via AWS SES"""

    @staticmethod
    def _get_ses_client():
        """Get AWS SES client"""
        if not settings.SES_ACCESS_KEY_ID or not settings.SES_SECRET_ACCESS_KEY:
            raise Exception("AWS SES credentials not configured")

        return boto3.client(
            "ses",
            region_name=settings.SES_REGION,
            aws_access_key_id=settings.SES_ACCESS_KEY_ID,
            aws_secret_access_key=settings.SES_SECRET_ACCESS_KEY,
        )

    @staticmethod
    async def send_assignment_email(assignment: Assignment) -> EmailSend:
        """
        Send assignment notification email.

        Args:
            assignment: The assignment object

        Returns:
            EmailSend object with send status
        """
        # Idempotency check: look for existing successful send
        existing_sends = await EmailSendRepository.find_by_assignment(assignment.id)
        successful_send = next(
            (s for s in existing_sends if s.get("status") == "sent"), None
        )
        if successful_send:
            logger.info(f"Email already sent for assignment {assignment.id}")
            return EmailSend(**successful_send)

        # Create email send record (status=pending)
        email_send_doc = {
            "id": str(uuid.uuid4()),
            "assignment_id": assignment.id,
            "recipient": "",  # Will be set after fetching candidate
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
        }

        try:
            # Fetch related data
            project = await ProjectRepository.find_by_id(assignment.project_id)
            candidate = await CandidateRepository.find_by_id(assignment.candidate_id)

            if not project or not candidate:
                raise Exception("Project or candidate not found")

            candidate_name = candidate.get("name", "there")
            candidate_email = candidate.get("email")
            project_name = project.get("name", "our project")
            role = assignment.role

            if not candidate_email:
                raise Exception("Candidate email not found")

            email_send_doc["recipient"] = candidate_email

            # Save initial record
            await EmailSendRepository.create(prepare_for_mongo(email_send_doc.copy()))

            # Build email content
            html_content = get_assignment_email_html(
                candidate_name=candidate_name,
                project_name=project_name,
                role=role,
                company_name=settings.COMPANY_NAME,
                logo_url=settings.COMPANY_LOGO_URL,
                support_email=settings.SUPPORT_EMAIL,
            )

            text_content = get_assignment_email_text(
                candidate_name=candidate_name,
                project_name=project_name,
                role=role,
                company_name=settings.COMPANY_NAME,
                support_email=settings.SUPPORT_EMAIL,
            )

            # Send via SES with retry logic
            max_retries = 3
            retry_delay = 1  # seconds

            for attempt in range(max_retries):
                try:
                    ses_client = EmailService._get_ses_client()
                    response = ses_client.send_email(
                        Source=settings.SES_FROM_ADDRESS,
                        Destination={"ToAddresses": [candidate_email]},
                        Message={
                            "Subject": {
                                "Data": f"You've been assigned to {project_name}",
                                "Charset": "UTF-8",
                            },
                            "Body": {
                                "Text": {"Data": text_content, "Charset": "UTF-8"},
                                "Html": {"Data": html_content, "Charset": "UTF-8"},
                            },
                        },
                    )

                    # Success
                    message_id = response.get("MessageId")
                    await EmailSendRepository.update_fields(
                        email_send_doc["id"],
                        {
                            "status": "sent",
                            "provider_message_id": message_id,
                            "sent_at": datetime.now(timezone.utc),
                        },
                    )

                    logger.info(
                        f"Email sent successfully for assignment {assignment.id}: {message_id}"
                    )
                    email_send_doc["status"] = "sent"
                    email_send_doc["provider_message_id"] = message_id
                    email_send_doc["sent_at"] = datetime.now(timezone.utc)
                    return EmailSend(**email_send_doc)

                except ClientError as e:
                    error_code = e.response["Error"]["Code"]

                    # Don't retry on 4xx errors (except throttling)
                    if error_code == "Throttling":
                        if attempt < max_retries - 1:
                            time.sleep(
                                retry_delay * (2**attempt)
                            )  # Exponential backoff
                            continue
                    elif error_code.startswith("4"):
                        # Client error, don't retry
                        raise

                    # Retry on 5xx errors
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay * (2**attempt))
                        continue
                    raise

        except Exception as e:
            # Log error and update email send record
            error_msg = str(e)
            logger.error(
                f"Failed to send assignment email for {assignment.id}: {error_msg}",
                exc_info=True,
            )

            await EmailSendRepository.update_fields(
                email_send_doc["id"], {"status": "failed", "error": error_msg}
            )

            # Return failed email send (don't raise - assignment should still succeed)
            email_send_doc["status"] = "failed"
            email_send_doc["error"] = error_msg
            return EmailSend(**email_send_doc)
