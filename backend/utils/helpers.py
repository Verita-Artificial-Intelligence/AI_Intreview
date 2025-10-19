from datetime import datetime


def prepare_for_mongo(data):
    """Convert datetime objects to ISO format strings for MongoDB storage"""
    if isinstance(data.get("created_at"), datetime):
        data["created_at"] = data["created_at"].isoformat()
    if isinstance(data.get("completed_at"), datetime):
        data["completed_at"] = data["completed_at"].isoformat()
    if isinstance(data.get("timestamp"), datetime):
        data["timestamp"] = data["timestamp"].isoformat()
    return data


def parse_from_mongo(item):
    """Convert ISO format strings back to datetime objects after MongoDB retrieval"""
    if isinstance(item.get("created_at"), str):
        item["created_at"] = datetime.fromisoformat(item["created_at"])
    if isinstance(item.get("completed_at"), str):
        item["completed_at"] = datetime.fromisoformat(item["completed_at"])
    if isinstance(item.get("timestamp"), str):
        item["timestamp"] = datetime.fromisoformat(item["timestamp"])
    return item
