from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorCollection
from utils import prepare_for_mongo


class BaseRepository:
    """
    Base repository providing common database operations.
    All repositories should inherit from this class.
    """

    @staticmethod
    def prepare_for_storage(data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare data for MongoDB storage (handles datetime serialization)"""
        return prepare_for_mongo(data)

    @staticmethod
    async def find_one(
        collection: AsyncIOMotorCollection,
        query: Dict[str, Any],
        projection: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Find a single document matching the query"""
        if projection is None:
            projection = {"_id": 0}
        return await collection.find_one(query, projection)

    @staticmethod
    async def find_many(
        collection: AsyncIOMotorCollection,
        query: Dict[str, Any],
        projection: Optional[Dict[str, Any]] = None,
        limit: int = 1000,
        sort: Optional[List[tuple]] = None,
    ) -> List[Dict[str, Any]]:
        """Find multiple documents matching the query"""
        if projection is None:
            projection = {"_id": 0}

        cursor = collection.find(query, projection)

        if sort:
            cursor = cursor.sort(sort)

        return await cursor.to_list(limit)

    @staticmethod
    async def insert_one(
        collection: AsyncIOMotorCollection, document: Dict[str, Any]
    ) -> bool:
        """Insert a single document"""
        doc = BaseRepository.prepare_for_storage(document.copy())
        result = await collection.insert_one(doc)
        return result.inserted_id is not None

    @staticmethod
    async def update_one(
        collection: AsyncIOMotorCollection,
        query: Dict[str, Any],
        update: Dict[str, Any],
    ) -> int:
        """
        Update a single document matching the query.
        Returns the number of documents modified.
        """
        prepared_update = {}
        for key, value in update.items():
            if key.startswith("$"):
                # Already a MongoDB operator
                prepared_update[key] = value
            else:
                # Wrap in $set operator
                if "$set" not in prepared_update:
                    prepared_update["$set"] = {}
                prepared_update["$set"][key] = value

        result = await collection.update_one(query, prepared_update)
        return result.modified_count

    @staticmethod
    async def delete_one(
        collection: AsyncIOMotorCollection, query: Dict[str, Any]
    ) -> int:
        """
        Delete a single document matching the query.
        Returns the number of documents deleted.
        """
        result = await collection.delete_one(query)
        return result.deleted_count

    @staticmethod
    async def delete_many(
        collection: AsyncIOMotorCollection, query: Dict[str, Any]
    ) -> int:
        """
        Delete multiple documents matching the query.
        Returns the number of documents deleted.
        """
        result = await collection.delete_many(query)
        return result.deleted_count

    @staticmethod
    async def count_documents(
        collection: AsyncIOMotorCollection, query: Dict[str, Any]
    ) -> int:
        """Count documents matching the query"""
        return await collection.count_documents(query)
