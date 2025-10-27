"""
Clerk JWT verification utilities for candidate and admin authentication.
"""

import os
import logging
import requests
from typing import Optional, Dict, Any, Set
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient

from config import settings
from models.user import User
from database import db

logger = logging.getLogger(__name__)

# HTTP Bearer security scheme
bearer = HTTPBearer(auto_error=False)

# JWKS clients for both Clerk projects
candidate_jwks_client: Optional[PyJWKClient] = None
admin_jwks_client: Optional[PyJWKClient] = None


def init_clerk_jwks_clients():
    """Initialize JWKS clients for Clerk projects"""
    global candidate_jwks_client, admin_jwks_client

    if settings.CLERK_CANDIDATE_JWKS_URL:
        candidate_jwks_client = PyJWKClient(settings.CLERK_CANDIDATE_JWKS_URL)

    if settings.CLERK_ADMIN_JWKS_URL:
        admin_jwks_client = PyJWKClient(settings.CLERK_ADMIN_JWKS_URL)


def fetch_clerk_user_email(clerk_user_id: str, api_key: str) -> Optional[str]:
    """
    Fetch user email from Clerk REST API.

    Args:
        clerk_user_id: Clerk user ID (sub claim from JWT)
        api_key: Clerk API key (secret key starting with sk_)

    Returns:
        Primary email address or None if not found
    """
    if not api_key:
        logger.warning("No Clerk API key configured, cannot fetch user email")
        return None

    try:
        resp = requests.get(
            f"https://api.clerk.com/v1/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5,
        )
        resp.raise_for_status()
        user = resp.json()

        # Extract primary email from email_addresses array
        email = next(
            (
                e["email_address"]
                for e in user.get("email_addresses", [])
                if e.get("id") == user.get("primary_email_address_id")
            ),
            None,
        )

        # Fallback to first email if no primary
        if not email and user.get("email_addresses"):
            email = user["email_addresses"][0].get("email_address")

        return email

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch user from Clerk API: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching Clerk user: {str(e)}")
        return None


def fetch_clerk_user_email(clerk_user_id: str, api_key: str) -> Optional[str]:
    """
    Fetch user email from Clerk REST API.

    Args:
        clerk_user_id: Clerk user ID (sub claim from JWT)
        api_key: Clerk API key (secret key starting with sk_)

    Returns:
        Primary email address or None if not found
    """
    if not api_key:
        logger.warning("No Clerk API key configured, cannot fetch user email")
        return None

    try:
        resp = requests.get(
            f"https://api.clerk.com/v1/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5,
        )
        resp.raise_for_status()
        user = resp.json()

        # Extract primary email from email_addresses array
        email = next(
            (
                e["email_address"]
                for e in user.get("email_addresses", [])
                if e.get("id") == user.get("primary_email_address_id")
            ),
            None,
        )

        # Fallback to first email if no primary
        if not email and user.get("email_addresses"):
            email = user["email_addresses"][0].get("email_address")

        return email

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch user from Clerk API: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching Clerk user: {str(e)}")
        return None


def verify_clerk_token(
    token: str, jwks_client: PyJWKClient, issuer: str
) -> Dict[str, Any]:
    """
    Verify a Clerk JWT token and return the payload.

    Args:
        token: The JWT token to verify
        jwks_client: PyJWKClient instance for the Clerk project
        issuer: Expected issuer for the token

    Returns:
        Dict containing the token payload

    Raises:
        HTTPException: If token verification fails
    """
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token).key
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False},  # Clerk doesn't use aud claim
        )

        # Verify authorized party if configured
        azp = payload.get("azp")
        authorized_parties = [p for p in settings.CLERK_AUTHORIZED_PARTIES if p]
        if authorized_parties and azp and azp not in authorized_parties:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorized party",
            )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"JWT validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error verifying Clerk token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
        )


async def get_or_create_user_from_clerk(
    clerk_user_id: str, email: str, auth_provider: str
) -> User:
    """
    Get or create a user from Clerk authentication.

    Args:
        clerk_user_id: Clerk user ID from JWT payload (sub claim)
        email: User email from JWT payload
        auth_provider: "clerk_candidate" or "clerk_admin"

    Returns:
        User object
    """
    # Try to find user by clerk_user_id first
    user_doc = await db.users.find_one({"clerk_user_id": clerk_user_id})

    if user_doc:
        # Convert MongoDB document to User model
        return User(**user_doc)

    # Try to find user by email (for migration)
    user_doc = await db.users.find_one({"email": email})

    if user_doc:
        # Link existing user to Clerk account
        await db.users.update_one(
            {"_id": user_doc["_id"]},
            {
                "$set": {
                    "clerk_user_id": clerk_user_id,
                    "auth_provider": auth_provider,
                }
            },
        )
        user_doc["clerk_user_id"] = clerk_user_id
        user_doc["auth_provider"] = auth_provider

        return User(**user_doc)

    # Create new user from Clerk data
    from utils import prepare_for_mongo

    new_user = User(
        email=email,
        username=email.split("@")[0],  # Auto-generate username
        clerk_user_id=clerk_user_id,
        auth_provider=auth_provider,
        profile_completed=False,
    )

    user_dict = prepare_for_mongo(new_user.model_dump())
    await db.users.insert_one(user_dict)

    return new_user


async def require_candidate_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> User:
    """
    Dependency to require a candidate user authenticated via Clerk.

    Args:
        request: FastAPI request object
        credentials: HTTP Bearer credentials

    Returns:
        User object for the authenticated candidate

    Raises:
        HTTPException: If authentication fails
    """
    if not candidate_jwks_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk candidate authentication not configured",
        )

    # Get token from Authorization header or cookies
    token = None
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    else:
        token = request.cookies.get("__session")

    if not token:
        logger.error(
            f"No auth token found. Headers: {dict(request.headers)}, Cookies: {request.cookies}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    # Verify token
    payload = verify_clerk_token(
        token, candidate_jwks_client, settings.CLERK_CANDIDATE_ISSUER
    )

    # Get or create user from Clerk data
    clerk_user_id = payload.get("sub")

    # Try multiple email fields (Clerk can use different claims)
    email = (
        payload.get("email")
        or payload.get("email_address")
        or payload.get("primary_email_address")
        or (
            payload.get("email_addresses", [{}])[0].get("email_address")
            if payload.get("email_addresses")
            else None
        )
    )

    if not clerk_user_id:
        logger.error(
            f"Token payload missing user ID. Payload keys: {list(payload.keys())}"
        )
        logger.error(f"Payload contents: {payload}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload - missing user ID",
        )

    # If email not in token, fetch it from Clerk API
    if not email:
        logger.warning(
            f"Email not in token payload, fetching from Clerk API. Payload keys: {list(payload.keys())}"
        )

        # Try to find existing user first
        user_doc = await db.users.find_one({"clerk_user_id": clerk_user_id})
        if user_doc:
            return User(**user_doc)

        # For new users, fetch email from Clerk REST API
        email = fetch_clerk_user_email(
            clerk_user_id, settings.CLERK_CANDIDATE_SECRET_KEY
        )

        if not email:
            logger.error(
                f"Failed to get email for new Clerk user {clerk_user_id} from API"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to retrieve email address",
            )

    user = await get_or_create_user_from_clerk(clerk_user_id, email, "clerk_candidate")

    return user


async def require_admin_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> User:
    """
    Dependency to require an admin user authenticated via Clerk.

    Args:
        request: FastAPI request object
        credentials: HTTP Bearer credentials

    Returns:
        User object for the authenticated admin

    Raises:
        HTTPException: If authentication fails
    """
    if not admin_jwks_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk admin authentication not configured",
        )

    # Get token from Authorization header or cookies
    token = None
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    else:
        token = request.cookies.get("__session")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    # Verify token
    payload = verify_clerk_token(token, admin_jwks_client, settings.CLERK_ADMIN_ISSUER)

    # Get or create user from Clerk data
    clerk_user_id = payload.get("sub")

    # Try multiple email fields (Clerk can use different claims)
    email = (
        payload.get("email")
        or payload.get("email_address")
        or payload.get("primary_email_address")
        or (
            payload.get("email_addresses", [{}])[0].get("email_address")
            if payload.get("email_addresses")
            else None
        )
    )

    if not clerk_user_id:
        logger.error(
            f"Admin token payload missing user ID. Payload keys: {list(payload.keys())}"
        )
        logger.error(f"Admin payload contents: {payload}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload - missing user ID",
        )

    # If email not in token, fetch it from Clerk API
    if not email:
        logger.warning(
            f"Email not in admin token payload, fetching from Clerk API. Payload keys: {list(payload.keys())}"
        )

        # Try to find existing user first
        user_doc = await db.users.find_one({"clerk_user_id": clerk_user_id})
        if user_doc:
            return User(**user_doc)

        # For new users, fetch email from Clerk REST API
        email = fetch_clerk_user_email(clerk_user_id, settings.CLERK_ADMIN_SECRET_KEY)

        if not email:
            logger.error(
                f"Failed to get email for new admin Clerk user {clerk_user_id} from API"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to retrieve email address",
            )

    user = await get_or_create_user_from_clerk(clerk_user_id, email, "clerk_admin")

    return user
