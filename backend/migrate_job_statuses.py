"""
One-time migration script to update old job statuses to new workflow statuses
Run this once to migrate existing jobs:
  python migrate_job_statuses.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_statuses():
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.verita_db
    jobs_collection = db.jobs

    print("Starting job status migration...")

    # Count jobs by status
    all_jobs = await jobs_collection.find({}, {"_id": 0, "id": 1, "title": 1, "status": 1}).to_list(1000)
    print(f"\nFound {len(all_jobs)} total jobs")

    # Show current status distribution
    status_counts = {}
    for job in all_jobs:
        status = job.get('status', 'missing')
        status_counts[status] = status_counts.get(status, 0) + 1

    print("\nCurrent status distribution:")
    for status, count in status_counts.items():
        print(f"  {status}: {count} jobs")

    # Migrate "open" -> "pending"
    result_open = await jobs_collection.update_many(
        {"status": "open"},
        {"$set": {"status": "pending"}}
    )
    print(f"\nMigrated {result_open.modified_count} jobs from 'open' to 'pending'")

    # Migrate "closed" -> "archived"
    result_closed = await jobs_collection.update_many(
        {"status": "closed"},
        {"$set": {"status": "archived"}}
    )
    print(f"Migrated {result_closed.modified_count} jobs from 'closed' to 'archived'")

    # Set default "pending" for any jobs with null/missing status
    result_null = await jobs_collection.update_many(
        {"$or": [{"status": None}, {"status": {"$exists": False}}]},
        {"$set": {"status": "pending"}}
    )
    print(f"Set 'pending' status for {result_null.modified_count} jobs with missing status")

    # Show final status distribution
    all_jobs_after = await jobs_collection.find({}, {"_id": 0, "id": 1, "title": 1, "status": 1}).to_list(1000)
    status_counts_after = {}
    for job in all_jobs_after:
        status = job.get('status', 'missing')
        status_counts_after[status] = status_counts_after.get(status, 0) + 1

    print("\nFinal status distribution:")
    for status, count in status_counts_after.items():
        print(f"  {status}: {count} jobs")

    print("\n✅ Migration complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_statuses())
