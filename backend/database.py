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


async def create_indexes():
    """
    Create database indexes for optimal query performance.
    Should be called on application startup.
    """
    # Interviews collection indexes
    await db.interviews.create_index("candidate_id")
    await db.interviews.create_index([("candidate_id", 1), ("job_id", 1)])
    await db.interviews.create_index("status")
    await db.interviews.create_index("job_id")

    # Annotation tasks collection indexes
    await db.annotation_tasks.create_index([("job_id", 1), ("status", 1)])
    await db.annotation_tasks.create_index("annotator_id")

    # Jobs collection indexes
    await db.jobs.create_index("status")

    # Users collection indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index(
        "clerk_user_id", unique=True, sparse=True
    )  # Sparse index for Clerk users only
    await db.users.create_index("auth_provider")  # Index for filtering by auth provider

    # Candidates collection indexes (users are candidates)
    # No separate candidates collection, using users


async def shutdown_db_client():
    """Close MongoDB connection on application shutdown"""
    client.close()
