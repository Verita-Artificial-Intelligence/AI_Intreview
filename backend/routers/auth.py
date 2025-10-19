from fastapi import APIRouter
from models import UserCreate, UserLogin
from services import AuthService

router = APIRouter()


@router.post("/register")
async def register(user_data: UserCreate):
    """Register a new user"""
    return await AuthService.register(user_data)


@router.post("/login")
async def login(login_data: UserLogin):
    """Login user and return JWT token"""
    return await AuthService.login(login_data)
