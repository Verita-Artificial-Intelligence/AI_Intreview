"""
Migration endpoints for linking legacy users to Clerk accounts.

These endpoints are used during the lazy migration process when existing
users with legacy authentication try to log in with Clerk.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr

from services.clerk_migration_service import ClerkMigrationService
from utils.clerk_auth import require_candidate_user, require_admin_user
from models.user import User

router = APIRouter(prefix="/api/migration", tags=["migration"])


class CheckLegacyUserRequest(BaseModel):
    """Request to check if a user exists as a legacy account"""

    email: EmailStr


class LinkClerkAccountRequest(BaseModel):
    """Request to link a legacy account to Clerk"""

    email: EmailStr


@router.post("/check-legacy-user")
async def check_legacy_user(request: CheckLegacyUserRequest):
    """
    Check if a user exists as a legacy user (not yet migrated to Clerk).

    This endpoint is called by the frontend when a user tries to sign in
    and we want to provide helpful messaging about migration.

    Returns:
        - exists: Whether the user exists in the database
        - is_legacy: Whether the user is a legacy user (no Clerk account)
        - has_profile: Whether the user has completed their profile
        - message: Human-readable message about migration status
    """
    result = await ClerkMigrationService.check_legacy_user(request.email)
    return result


@router.post("/link-clerk-candidate")
async def link_clerk_candidate_account(
    request: LinkClerkAccountRequest,
    current_user: User = Depends(require_candidate_user),
):
    """
    Link a legacy user account to the current Clerk candidate account.

    This endpoint is called after a user successfully signs in with Clerk
    for the first time, and we need to link their legacy account data.

    The current_user is extracted from the Clerk JWT token, which provides
    the clerk_user_id and email.

    Args:
        request: Contains the email to link
        current_user: Current user from Clerk JWT (auto-populated)

    Returns:
        Updated user object with Clerk linkage
    """
    # Verify the email in the request matches the authenticated user
    if request.email != current_user.email:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email mismatch - cannot link different email",
        )

    # Link the account (this will handle all validation)
    user = await ClerkMigrationService.link_clerk_account(
        email=request.email,
        clerk_user_id=current_user.clerk_user_id,
        auth_provider="clerk_candidate",
    )

    return {
        "status": "success",
        "message": "Account successfully migrated to Clerk",
        "user": user,
    }


@router.post("/link-clerk-admin")
async def link_clerk_admin_account(
    request: LinkClerkAccountRequest,
    current_user: User = Depends(require_admin_user),
):
    """
    Link a legacy admin account to the current Clerk admin account.

    Similar to link_clerk_candidate_account but for admin users.

    Args:
        request: Contains the email to link
        current_user: Current admin user from Clerk JWT (auto-populated)

    Returns:
        Updated user object with Clerk linkage
    """
    # Verify the email in the request matches the authenticated user
    if request.email != current_user.email:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email mismatch - cannot link different email",
        )

    # Link the account
    user = await ClerkMigrationService.link_clerk_account(
        email=request.email,
        clerk_user_id=current_user.clerk_user_id,
        auth_provider="clerk_admin",
    )

    return {
        "status": "success",
        "message": "Admin account successfully migrated to Clerk",
        "user": user,
    }


@router.get("/status")
async def migration_status(current_user: User = Depends(require_candidate_user)):
    """
    Get migration status for the current user.

    This endpoint can be used to check if a user has been fully migrated
    and if there are any pending migration tasks.

    Returns:
        - is_migrated: Whether the user is using Clerk authentication
        - auth_provider: The authentication provider
        - profile_completed: Whether the user has completed their profile
    """
    return {
        "is_migrated": current_user.clerk_user_id is not None,
        "auth_provider": current_user.auth_provider,
        "profile_completed": current_user.profile_completed,
        "user_id": current_user.id,
    }
