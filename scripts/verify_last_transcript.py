import asyncio
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
load_dotenv(dotenv_path=dotenv_path)

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ai_interview")

def get_interviews_collection():
    """Connects to MongoDB and returns the interviews collection."""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    return db["interviews"]

async def verify_last_transcript():
    """Fetches the most recent interview and prints its transcript."""
    print("Connecting to database to verify last interview transcript...")
    
    try:
        interviews_collection = get_interviews_collection()
        
        # Find the most recently created interview
        last_interview = interviews_collection.find_one(
            sort=[("created_at", -1)]
        )
        
        if not last_interview:
            print("\n❌ No interviews found in the database.")
            return

        interview_id = last_interview.get("id")
        created_at = last_interview.get("created_at")
        transcript = last_interview.get("transcript")

        print(f"\n✅ Found last interview:")
        print(f"   ID: {interview_id}")
        print(f"   Created At: {created_at}")

        if not transcript:
            print("\n❌ The transcript is empty. The transcription process may have failed.")
        else:
            print("\n--- Transcript ---")
            for item in transcript:
                speaker = item.get("speaker", "unknown").capitalize()
                text = item.get("text", "")
                print(f"[{speaker}]: {text}")
            print("--------------------")
            print("\n✅ Transcript was successfully saved.")

    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
    finally:
        # Pymongo's client doesn't need to be explicitly closed in this simple script
        pass

if __name__ == "__main__":
    asyncio.run(verify_last_transcript())
