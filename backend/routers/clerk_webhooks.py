"""
Clerk webhook endpoints for user synchronization.

These endpoints receive webhook events from Clerk when users are created,
updated, or deleted, and sync the changes to our MongoDB database.
"""

from fastapi import APIRouter, Request, HTTPException, status, Header
from typing import Optional
import json
import hmac
import hashlib
import time

from services.clerk_migration_service import ClerkMigrationService
from config import settings

router = APIRouter(prefix="/api/webhooks/clerk", tags=["clerk-webhooks"])


def verify_clerk_webhook_signature(
    payload: bytes, headers: dict, webhook_secret: str
) -> bool:
    """
    Verify Clerk webhook signature using Svix format.

    Clerk uses Svix for webhooks, which provides signature verification.
    The signature is in the svix-signature header.

    Args:
        payload: Raw request body bytes
        headers: Request headers
        webhook_secret: Webhook secret from Clerk dashboard

    Returns:
        True if signature is valid
    """
    if not webhook_secret:
        # If no webhook secret configured, skip verification (dev mode only)
        return True

    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        return False

    # Verify timestamp is recent (within 5 minutes)
    try:
        timestamp = int(svix_timestamp)
        current_time = int(time.time())
        if abs(current_time - timestamp) > 300:  # 5 minutes
            return False
    except ValueError:
        return False

    # Construct the signed content
    signed_content = f"{svix_id}.{svix_timestamp}.{payload.decode('utf-8')}"

    # Compute expected signature
    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        signed_content.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Extract signatures from header (format: "v1,signature1 v1,signature2")
    signatures = []
    for sig in svix_signature.split(" "):
        if "," in sig:
            version, signature = sig.split(",", 1)
            if version == "v1":
                signatures.append(signature)

    # Compare with constant-time comparison
    return any(hmac.compare_digest(expected_signature, sig) for sig in signatures)


@router.post("/candidate")
async def handle_candidate_webhook(
    request: Request,
    svix_id: Optional[str] = Header(None),
    svix_timestamp: Optional[str] = Header(None),
    svix_signature: Optional[str] = Header(None),
):
    """
    Handle webhooks from Clerk candidate project (interview-frontend users).

    Events:
    - user.created: New user signed up
    - user.updated: User information updated
    - user.deleted: User deleted their account
    """
    # Read raw body for signature verification
    body_bytes = await request.body()

    # Verify webhook signature
    headers = {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
    }

    webhook_secret = settings.CLERK_CANDIDATE_SECRET_KEY
    if not verify_clerk_webhook_signature(body_bytes, headers, webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    # Parse webhook payload
    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    event_type = payload.get("type")
    data = payload.get("data", {})

    try:
        if event_type == "user.created":
            # New user signed up
            clerk_user_id = data.get("id")
            email_addresses = data.get("email_addresses", [])
            primary_email = next(
                (
                    e["email_address"]
                    for e in email_addresses
                    if e.get("id") == data.get("primary_email_address_id")
                ),
                None,
            )

            if not clerk_user_id or not primary_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required user data",
                )

            # Extract metadata
            metadata = {
                "first_name": data.get("first_name"),
                "last_name": data.get("last_name"),
            }

            user = await ClerkMigrationService.sync_clerk_user(
                clerk_user_id=clerk_user_id,
                email=primary_email,
                auth_provider="clerk_candidate",
                metadata=metadata,
            )

            return {"status": "success", "action": "user_created", "user_id": user.id}

        elif event_type == "user.updated":
            # User information updated
            clerk_user_id = data.get("id")
            email_addresses = data.get("email_addresses", [])
            primary_email = next(
                (
                    e["email_address"]
                    for e in email_addresses
                    if e.get("id") == data.get("primary_email_address_id")
                ),
                None,
            )

            if not clerk_user_id or not primary_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required user data",
                )

            metadata = {
                "first_name": data.get("first_name"),
                "last_name": data.get("last_name"),
            }

            user = await ClerkMigrationService.sync_clerk_user(
                clerk_user_id=clerk_user_id,
                email=primary_email,
                auth_provider="clerk_candidate",
                metadata=metadata,
            )

            return {"status": "success", "action": "user_updated", "user_id": user.id}

        elif event_type == "user.deleted":
            # User deleted their account
            clerk_user_id = data.get("id")

            if not clerk_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing user ID",
                )

            deleted = await ClerkMigrationService.delete_clerk_user(clerk_user_id)

            return {
                "status": "success",
                "action": "user_deleted",
                "deleted": deleted,
            }

        else:
            # Unknown event type - just acknowledge it
            return {"status": "success", "action": "ignored", "event_type": event_type}

    except Exception as e:
        # Log error but return 200 to prevent Clerk from retrying
        print(f"Error processing Clerk candidate webhook: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.post("/admin")
async def handle_admin_webhook(
    request: Request,
    svix_id: Optional[str] = Header(None),
    svix_timestamp: Optional[str] = Header(None),
    svix_signature: Optional[str] = Header(None),
):
    """
    Handle webhooks from Clerk admin project (dashboard-frontend users).

    Events:
    - user.created: New admin user created
    - user.updated: Admin user information updated
    - user.deleted: Admin user deleted
    """
    # Read raw body for signature verification
    body_bytes = await request.body()

    # Verify webhook signature
    headers = {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
    }

    webhook_secret = settings.CLERK_ADMIN_SECRET_KEY
    if not verify_clerk_webhook_signature(body_bytes, headers, webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    # Parse webhook payload
    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    event_type = payload.get("type")
    data = payload.get("data", {})

    try:
        if event_type == "user.created":
            clerk_user_id = data.get("id")
            email_addresses = data.get("email_addresses", [])
            primary_email = next(
                (
                    e["email_address"]
                    for e in email_addresses
                    if e.get("id") == data.get("primary_email_address_id")
                ),
                None,
            )

            if not clerk_user_id or not primary_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required user data",
                )

            metadata = {
                "first_name": data.get("first_name"),
                "last_name": data.get("last_name"),
            }

            user = await ClerkMigrationService.sync_clerk_user(
                clerk_user_id=clerk_user_id,
                email=primary_email,
                auth_provider="clerk_admin",
                metadata=metadata,
            )

            return {"status": "success", "action": "admin_created", "user_id": user.id}

        elif event_type == "user.updated":
            clerk_user_id = data.get("id")
            email_addresses = data.get("email_addresses", [])
            primary_email = next(
                (
                    e["email_address"]
                    for e in email_addresses
                    if e.get("id") == data.get("primary_email_address_id")
                ),
                None,
            )

            if not clerk_user_id or not primary_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required user data",
                )

            metadata = {
                "first_name": data.get("first_name"),
                "last_name": data.get("last_name"),
            }

            user = await ClerkMigrationService.sync_clerk_user(
                clerk_user_id=clerk_user_id,
                email=primary_email,
                auth_provider="clerk_admin",
                metadata=metadata,
            )

            return {"status": "success", "action": "admin_updated", "user_id": user.id}

        elif event_type == "user.deleted":
            clerk_user_id = data.get("id")

            if not clerk_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing user ID",
                )

            deleted = await ClerkMigrationService.delete_clerk_user(clerk_user_id)

            return {
                "status": "success",
                "action": "admin_deleted",
                "deleted": deleted,
            }

        else:
            return {"status": "success", "action": "ignored", "event_type": event_type}

    except Exception as e:
        print(f"Error processing Clerk admin webhook: {str(e)}")
        return {"status": "error", "message": str(e)}
