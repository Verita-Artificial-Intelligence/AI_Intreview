from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URL, DB_NAME

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


def get_users_collection():
    """Get users collection"""
    return db["users"]


def get_interviews_collection():
    """Get interviews collection"""
    return db["interviews"]


def get_jobs_collection():
    """Get jobs collection"""
    return db["jobs"]


def get_candidates_collection():
    """Get candidates collection"""
    return db["candidates"]


async def shutdown_db_client():
    """Close MongoDB connection on application shutdown"""
    client.close()
