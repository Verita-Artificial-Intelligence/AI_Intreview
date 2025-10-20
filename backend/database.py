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


def get_annotations_collection():
    """Get annotation tasks collection"""
    return db["annotation_tasks"]


def get_annotation_data_collection():
    """Get annotation data collection"""
    return db["annotation_data"]


def get_earnings_collection():
    """Get earnings collection"""
    return db["earnings"]


async def shutdown_db_client():
    """Close MongoDB connection on application shutdown"""
    client.close()
