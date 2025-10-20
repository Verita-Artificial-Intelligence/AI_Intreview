"""
Resume text extraction service.
Handles resume uploads and text extraction.
Isolated and fault-tolerant - failures won't break the main application.
"""

import logging
from typing import Optional
from pathlib import Path
import PyPDF2
import docx
from fastapi import UploadFile

logger = logging.getLogger(__name__)


class ResumeService:
    """
    Service for handling resume uploads and text extraction.
    All methods are designed to fail gracefully without breaking the application.
    """

    SUPPORTED_FORMATS = {'.pdf', '.txt', '.doc', '.docx'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    @staticmethod
    async def extract_text_from_upload(file: UploadFile) -> Optional[str]:
        """
        Extract text from an uploaded resume file.

        Args:
            file: FastAPI UploadFile object

        Returns:
            Extracted text as string, or None if extraction fails

        Raises:
            No exceptions - all errors are caught and logged
        """
        try:
            # Validate file
            if not file:
                logger.warning("No file provided for resume extraction")
                return None

            # Check file extension
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in ResumeService.SUPPORTED_FORMATS:
                logger.warning(f"Unsupported resume format: {file_ext}")
                return None

            # Read file content
            content = await file.read()

            # Check file size
            if len(content) > ResumeService.MAX_FILE_SIZE:
                logger.warning(f"Resume file too large: {len(content)} bytes")
                return None

            # Reset file pointer for potential reuse
            await file.seek(0)

            # Extract text based on file type
            if file_ext == '.pdf':
                return ResumeService._extract_from_pdf(content)
            elif file_ext == '.txt':
                return ResumeService._extract_from_txt(content)
            elif file_ext in ['.doc', '.docx']:
                return ResumeService._extract_from_docx(content)
            else:
                logger.warning(f"Unhandled resume format: {file_ext}")
                return None

        except Exception as e:
            logger.error(f"Error extracting resume text: {str(e)}", exc_info=True)
            return None

    @staticmethod
    def _extract_from_pdf(content: bytes) -> Optional[str]:
        """
        Extract text from PDF file content.

        Args:
            content: PDF file bytes

        Returns:
            Extracted text or None if extraction fails
        """
        try:
            import io
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            text_parts = []
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

            extracted_text = "\n".join(text_parts).strip()

            if not extracted_text:
                logger.warning("PDF extraction resulted in empty text")
                return None

            return extracted_text

        except Exception as e:
            logger.error(f"PDF extraction error: {str(e)}")
            return None

    @staticmethod
    def _extract_from_txt(content: bytes) -> Optional[str]:
        """
        Extract text from TXT file content.

        Args:
            content: TXT file bytes

        Returns:
            Extracted text or None if extraction fails
        """
        try:
            # Try UTF-8 first, fallback to latin-1
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                text = content.decode('latin-1')

            extracted_text = text.strip()

            if not extracted_text:
                logger.warning("TXT file is empty")
                return None

            return extracted_text

        except Exception as e:
            logger.error(f"TXT extraction error: {str(e)}")
            return None

    @staticmethod
    def _extract_from_docx(content: bytes) -> Optional[str]:
        """
        Extract text from DOCX file content.

        Args:
            content: DOCX file bytes

        Returns:
            Extracted text or None if extraction fails
        """
        try:
            import io
            doc_file = io.BytesIO(content)
            doc = docx.Document(doc_file)

            text_parts = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)

            extracted_text = "\n".join(text_parts).strip()

            if not extracted_text:
                logger.warning("DOCX extraction resulted in empty text")
                return None

            return extracted_text

        except Exception as e:
            logger.error(f"DOCX extraction error: {str(e)}")
            return None

    @staticmethod
    def sanitize_resume_text(text: str, max_length: int = 10000) -> str:
        """
        Sanitize and truncate resume text for storage and processing.

        Args:
            text: Raw extracted text
            max_length: Maximum character length

        Returns:
            Sanitized text
        """
        try:
            if not text:
                return ""

            # Remove excessive whitespace
            lines = [line.strip() for line in text.split('\n')]
            lines = [line for line in lines if line]  # Remove empty lines
            sanitized = "\n".join(lines)

            # Truncate if too long
            if len(sanitized) > max_length:
                sanitized = sanitized[:max_length] + "... [truncated]"
                logger.info(f"Resume text truncated to {max_length} characters")

            return sanitized

        except Exception as e:
            logger.error(f"Error sanitizing resume text: {str(e)}")
            return text[:max_length] if text else ""
