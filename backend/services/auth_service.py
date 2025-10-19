from fastapi import HTTPException
from models import User, UserCreate, UserLogin
from utils import (
    hash_password,
    verify_password,
    create_access_token,
    prepare_for_mongo,
    parse_from_mongo,
)
from database import db


class AuthService:
    @staticmethod
    async def register(user_data: UserCreate):
        """Register a new user"""
        # Check if user exists
        existing = await db.users.find_one({"email": user_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user with auto-generated username from email
        username = user_data.email.split("@")[0]
        user = User(username=username, email=user_data.email)

        user_dict = user.model_dump()
        user_dict["password"] = hash_password(user_data.password)
        user_dict = prepare_for_mongo(user_dict)

        await db.users.insert_one(user_dict)

        token = create_access_token({"user_id": user.id, "email": user.email})
        return {"token": token, "user": user}

    @staticmethod
    async def login(login_data: UserLogin):
        """Authenticate a user and return JWT token"""
        user = await db.users.find_one({"email": login_data.email})
        if not user or not verify_password(login_data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user = parse_from_mongo(user)
        token = create_access_token({"user_id": user["id"], "email": user["email"]})

        return {"token": token, "user": User(**user)}
