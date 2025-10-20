#!/usr/bin/env python3
"""
Test script to verify the full analysis flow including database persistence.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
load_dotenv(backend_path / ".env")

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ai_interview")

def get_interviews_collection():
    """Connect to MongoDB and return interviews collection."""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    return db["interviews"]

async def test_full_analysis_flow():
    """Test the complete analysis flow including database persistence."""
    print("🔍 Testing full analysis flow with database persistence...")
    
    try:
        interviews_collection = get_interviews_collection()
        
        # Find the most recent completed interview
        last_interview = interviews_collection.find_one(
            {"status": "completed", "transcript": {"$exists": True, "$ne": []}},
            sort=[("created_at", -1)]
        )
        
        if not last_interview:
            print("\n❌ No completed interviews with transcripts found.")
            return
        
        interview_id = last_interview.get("id")
        print(f"\n✅ Found interview: {interview_id}")
        
        # Clear any existing analysis to test fresh generation
        interviews_collection.update_one(
            {"id": interview_id},
            {"$unset": {"analysis_result": "", "analysis_status": ""}}
        )
        print("🧹 Cleared existing analysis for fresh test")
        
        # Test analysis generation via InterviewService (same as API endpoint)
        print(f"\n🤖 Generating analysis via InterviewService...")
        
        from services.interview_service import InterviewService
        
        try:
            analysis = await InterviewService.analyze_interview(interview_id, "behavioral")
            
            print("\n✅ Analysis generated successfully!")
            print(f"   Overall Score: {analysis.get('overall_score', 'N/A')}/10")
            print(f"   Recommendation: {analysis.get('recommendation', 'N/A')}")
            print(f"   Confidence: {analysis.get('confidence', 'N/A')}%")
            
            # Verify analysis was saved to database
            updated_interview = interviews_collection.find_one({"id": interview_id})
            saved_analysis = updated_interview.get("analysis_result")
            analysis_status = updated_interview.get("analysis_status")
            
            if saved_analysis and analysis_status == "completed":
                print("\n✅ Analysis saved to database successfully!")
                print(f"   Analysis Status: {analysis_status}")
                print(f"   Saved Overall Score: {saved_analysis.get('overall_score', 'N/A')}/10")
                print(f"   Saved Recommendation: {saved_analysis.get('recommendation', 'N/A')}")
                
                # Test persistence - simulate reopening the page
                print(f"\n🔄 Testing persistence (simulating page reload)...")
                
                # Fetch the interview again (like the admin page would)
                reloaded_interview = interviews_collection.find_one({"id": interview_id})
                reloaded_analysis = reloaded_interview.get("analysis_result")
                
                if reloaded_analysis:
                    print("✅ Analysis persists correctly!")
                    print(f"   Reloaded Overall Score: {reloaded_analysis.get('overall_score', 'N/A')}/10")
                    print(f"   Reloaded Recommendation: {reloaded_analysis.get('recommendation', 'N/A')}")
                    
                    # Verify they match
                    if (reloaded_analysis.get('overall_score') == analysis.get('overall_score') and
                        reloaded_analysis.get('recommendation') == analysis.get('recommendation')):
                        print("✅ Analysis data matches perfectly - persistence verified!")
                    else:
                        print("⚠️  Analysis data doesn't match exactly")
                else:
                    print("❌ Analysis not found on reload")
                    
            else:
                print(f"\n❌ Analysis not saved properly. Status: {analysis_status}")
                
        except Exception as analysis_error:
            print(f"\n❌ Analysis failed: {analysis_error}")
            import traceback
            traceback.print_exc()
            return
            
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_full_analysis_flow())
