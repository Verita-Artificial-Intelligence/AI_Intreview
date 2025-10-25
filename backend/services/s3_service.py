"""
S3 Service for managing file uploads and downloads.

Handles all interactions with AWS S3 for durable file storage.
"""

import logging
import boto3
from botocore.exceptions import ClientError, BotoCoreError
from pathlib import Path
from typing import Optional, BinaryIO
from datetime import datetime
from config import settings
import os

logger = logging.getLogger(__name__)


class S3Service:
    """
    Service for handling S3 operations.
    All file uploads/downloads go through S3 for durability and scalability.
    """

    def __init__(self):
        """Initialize S3 client with AWS credentials from environment."""
        self.bucket_name = os.environ.get("S3_BUCKET")
        self.region = os.environ.get("AWS_REGION", "us-east-1")

        if not self.bucket_name:
            logger.warning("S3_BUCKET environment variable not set")

        try:
            self.s3_client = boto3.client("s3", region_name=self.region)
            logger.info(f"S3 client initialized for bucket: {self.bucket_name}")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self.s3_client = None

    def is_configured(self) -> bool:
        """Check if S3 is properly configured."""
        return self.bucket_name is not None and self.s3_client is not None

    async def upload_file(
        self,
        file_content: bytes,
        s3_key: str,
        content_type: str = "application/octet-stream",
        is_temp: bool = False
    ) -> Optional[str]:
        """
        Upload file to S3.

        Args:
            file_content: File content as bytes
            s3_key: S3 object key (path in bucket)
            content_type: MIME type of the file
            is_temp: Whether this is a temporary file (will be auto-deleted after 7 days)

        Returns:
            S3 key if successful, None otherwise
        """
        if not self.is_configured():
            logger.error("S3 not configured, cannot upload file")
            return None

        try:
            tags = {
                "FileType": "temp" if is_temp else "final",
                "CreatedAt": datetime.utcnow().isoformat()
            }
            tag_set = "&".join([f"{k}={v}" for k, v in tags.items()])

            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                Tagging=tag_set
            )

            logger.info(f"Uploaded file to S3: s3://{self.bucket_name}/{s3_key} (temp={is_temp})")
            return s3_key

        except (ClientError, BotoCoreError) as e:
            logger.error(f"S3 upload failed for {s3_key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error uploading to S3: {e}")
            return None

    async def upload_file_from_path(
        self,
        file_path: Path,
        s3_key: str,
        content_type: str = "application/octet-stream",
        is_temp: bool = False
    ) -> Optional[str]:
        """
        Upload file from local path to S3.

        Args:
            file_path: Path to local file
            s3_key: S3 object key
            content_type: MIME type
            is_temp: Whether this is a temporary file

        Returns:
            S3 key if successful, None otherwise
        """
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            return await self.upload_file(content, s3_key, content_type, is_temp)
        except Exception as e:
            logger.error(f"Error reading file {file_path} for S3 upload: {e}")
            return None

    async def download_file(self, s3_key: str) -> Optional[bytes]:
        """
        Download file from S3.

        Args:
            s3_key: S3 object key

        Returns:
            File content as bytes, or None if failed
        """
        if not self.is_configured():
            logger.error("S3 not configured, cannot download file")
            return None

        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            content = response["Body"].read()
            logger.info(f"Downloaded file from S3: s3://{self.bucket_name}/{s3_key}")
            return content

        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                logger.warning(f"File not found in S3: {s3_key}")
            else:
                logger.error(f"S3 download failed for {s3_key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error downloading from S3: {e}")
            return None

    async def download_file_to_path(self, s3_key: str, local_path: Path) -> bool:
        """
        Download file from S3 to local path.

        Args:
            s3_key: S3 object key
            local_path: Local path to save file

        Returns:
            True if successful, False otherwise
        """
        content = await self.download_file(s3_key)
        if content is None:
            return False

        try:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(content)
            logger.info(f"Saved S3 file to local path: {local_path}")
            return True
        except Exception as e:
            logger.error(f"Error writing S3 content to {local_path}: {e}")
            return False

    async def delete_file(self, s3_key: str) -> bool:
        """
        Delete file from S3.

        Args:
            s3_key: S3 object key

        Returns:
            True if successful, False otherwise
        """
        if not self.is_configured():
            logger.error("S3 not configured, cannot delete file")
            return False

        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Deleted file from S3: s3://{self.bucket_name}/{s3_key}")
            return True

        except (ClientError, BotoCoreError) as e:
            logger.error(f"S3 delete failed for {s3_key}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting from S3: {e}")
            return False

    async def get_file_stream(self, s3_key: str):
        """
        Get streaming response for file in S3.

        Args:
            s3_key: S3 object key

        Returns:
            S3 streaming body or None
        """
        if not self.is_configured():
            logger.error("S3 not configured, cannot stream file")
            return None

        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response["Body"]

        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                logger.warning(f"File not found in S3: {s3_key}")
            else:
                logger.error(f"S3 stream failed for {s3_key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error streaming from S3: {e}")
            return None

    def generate_s3_key(self, prefix: str, filename: str) -> str:
        """
        Generate S3 key with proper structure.

        Args:
            prefix: Prefix (e.g., "videos", "audio", "annotations")
            filename: Filename

        Returns:
            Full S3 key
        """
        return f"{prefix}/{filename}"


# Singleton instance
s3_service = S3Service()
