"""
Service for managing migration of legacy users to Clerk authentication.
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from database import db
from models.user import User


class ClerkMigrationService:
    """Service for handling user migration from legacy auth to Clerk"""

    @staticmethod
    async def check_legacy_user(email: str) -> Dict[str, Any]:
        """
        Check if a user exists as a legacy user (no clerk_user_id).

        Args:
            email: User's email address

        Returns:
            Dict with migration status information
        """
        user_doc = await db.users.find_one({"email": email})

        if not user_doc:
            return {
                "exists": False,
                "is_legacy": False,
                "message": "No account found with this email",
            }

        # Check if user already has Clerk account linked
        if user_doc.get("clerk_user_id"):
            return {
                "exists": True,
                "is_legacy": False,
                "auth_provider": user_doc.get("auth_provider", "unknown"),
                "message": "Account already migrated to Clerk",
            }

        # User exists but not migrated
        return {
            "exists": True,
            "is_legacy": True,
            "has_profile": user_doc.get("profile_completed", False),
            "message": "Legacy account found - please reset your password to migrate",
        }

    @staticmethod
    async def link_clerk_account(
        email: str, clerk_user_id: str, auth_provider: str = "clerk_candidate"
    ) -> User:
        """
        Link a legacy user account to a Clerk account.

        Args:
            email: User's email address
            clerk_user_id: Clerk user ID from JWT
            auth_provider: "clerk_candidate" or "clerk_admin"

        Returns:
            Updated User object

        Raises:
            HTTPException: If user not found or already linked
        """
        user_doc = await db.users.find_one({"email": email})

        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No user found with this email address",
            )

        # Check if already linked to a different Clerk account
        existing_clerk_id = user_doc.get("clerk_user_id")
        if existing_clerk_id and existing_clerk_id != clerk_user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Account already linked to a different Clerk account",
            )

        # Check if this Clerk ID is already used by another user
        existing_clerk_user = await db.users.find_one({"clerk_user_id": clerk_user_id})
        if existing_clerk_user and existing_clerk_user.get("email") != email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This Clerk account is already linked to another user",
            )

        # Link the accounts
        result = await db.users.update_one(
            {"email": email},
            {
                "$set": {
                    "clerk_user_id": clerk_user_id,
                    "auth_provider": auth_provider,
                }
            },
        )

        if result.modified_count == 0 and not existing_clerk_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to link account",
            )

        # Fetch updated user
        updated_user_doc = await db.users.find_one({"email": email})
        return User(**updated_user_doc)

    @staticmethod
    async def sync_clerk_user(
        clerk_user_id: str,
        email: str,
        auth_provider: str = "clerk_candidate",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> User:
        """
        Sync or create a user from Clerk webhook data.

        Args:
            clerk_user_id: Clerk user ID
            email: User's email address
            auth_provider: "clerk_candidate" or "clerk_admin"
            metadata: Additional user metadata from Clerk

        Returns:
            User object (existing or newly created)
        """
        # Check if user exists by Clerk ID
        user_doc = await db.users.find_one({"clerk_user_id": clerk_user_id})

        if user_doc:
            # Update existing user
            update_fields = {"email": email, "auth_provider": auth_provider}

            # Update metadata if provided
            if metadata:
                if metadata.get("first_name") or metadata.get("last_name"):
                    name_parts = [
                        metadata.get("first_name", ""),
                        metadata.get("last_name", ""),
                    ]
                    full_name = " ".join(p for p in name_parts if p)
                    if full_name and not user_doc.get("name"):
                        update_fields["name"] = full_name

            await db.users.update_one(
                {"clerk_user_id": clerk_user_id}, {"$set": update_fields}
            )

            updated_user_doc = await db.users.find_one({"clerk_user_id": clerk_user_id})
            return User(**updated_user_doc)

        # Check if user exists by email (for linking)
        user_doc = await db.users.find_one({"email": email})

        if user_doc:
            # Link existing account
            await db.users.update_one(
                {"email": email},
                {
                    "$set": {
                        "clerk_user_id": clerk_user_id,
                        "auth_provider": auth_provider,
                    }
                },
            )

            updated_user_doc = await db.users.find_one({"email": email})
            return User(**updated_user_doc)

        # Create new user
        from utils import prepare_for_mongo

        new_user = User(
            email=email,
            username=email.split("@")[0],
            clerk_user_id=clerk_user_id,
            auth_provider=auth_provider,
            profile_completed=False,
        )

        # Add name from metadata if available
        if metadata:
            if metadata.get("first_name") or metadata.get("last_name"):
                name_parts = [
                    metadata.get("first_name", ""),
                    metadata.get("last_name", ""),
                ]
                full_name = " ".join(p for p in name_parts if p)
                if full_name:
                    new_user.name = full_name

        user_dict = prepare_for_mongo(new_user.model_dump())
        await db.users.insert_one(user_dict)

        return new_user

    @staticmethod
    async def delete_clerk_user(clerk_user_id: str) -> bool:
        """
        Handle user deletion from Clerk webhook.
        Instead of deleting, we mark the account as deleted and remove Clerk linkage.

        Args:
            clerk_user_id: Clerk user ID

        Returns:
            True if user was found and updated
        """
        result = await db.users.update_one(
            {"clerk_user_id": clerk_user_id},
            {
                "$set": {"auth_provider": "deleted", "clerk_user_id": None},
            },
        )

        return result.modified_count > 0
