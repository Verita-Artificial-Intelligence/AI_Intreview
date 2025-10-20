#!/usr/bin/env python3
"""
Test script to verify interview analysis works with current transcript format.
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

async def test_analysis():
    """Test the analysis system with the most recent interview."""
    print("🔍 Testing interview analysis system...")
    
    try:
        interviews_collection = get_interviews_collection()
        
        # Find the most recent completed interview
        last_interview = interviews_collection.find_one(
            {"status": "completed", "transcript": {"$exists": True, "$ne": []}},
            sort=[("created_at", -1)]
        )
        
        if not last_interview:
            print("\n❌ No completed interviews with transcripts found.")
            print("   Complete an interview first, then run this test.")
            return
        
        interview_id = last_interview.get("id")
        transcript = last_interview.get("transcript", [])
        
        print(f"\n✅ Found interview: {interview_id}")
        print(f"   Transcript entries: {len(transcript)}")
        print(f"   Status: {last_interview.get('status')}")
        
        # Show transcript preview
        print("\n--- Transcript Preview ---")
        for i, entry in enumerate(transcript[:3]):  # Show first 3 entries
            speaker = entry.get("speaker", "unknown").capitalize()
            text = entry.get("text", "")[:100] + ("..." if len(entry.get("text", "")) > 100 else "")
            print(f"[{i+1}] {speaker}: {text}")
        if len(transcript) > 3:
            print(f"... and {len(transcript) - 3} more entries")
        print("-------------------------")
        
        # Test analysis
        print(f"\n🤖 Testing analysis generation for interview {interview_id}...")
        
        # Import analysis service
        from services.analysis_service import AnalysisService
        
        try:
            analysis = await AnalysisService.analyze_interview(interview_id, "behavioral")
            
            print("\n✅ Analysis generated successfully!")
            print(f"   Overall Score: {analysis.get('overall_score', 'N/A')}/10")
            print(f"   Recommendation: {analysis.get('recommendation', 'N/A')}")
            print(f"   Confidence: {analysis.get('confidence', 'N/A')}%")
            
            # Show key insights
            insights = analysis.get('key_insights', [])
            if insights:
                print(f"   Key Insights: {len(insights)} insights generated")
                for i, insight in enumerate(insights[:2]):  # Show first 2
                    print(f"     • {insight[:80]}{'...' if len(insight) > 80 else ''}")
            
            # Check if analysis was saved to database
            updated_interview = interviews_collection.find_one({"id": interview_id})
            if updated_interview.get("analysis_result"):
                print("\n✅ Analysis saved to database successfully!")
                print(f"   Analysis Status: {updated_interview.get('analysis_status')}")
            else:
                print("\n⚠️  Analysis generated but not saved to database.")
                
        except Exception as analysis_error:
            print(f"\n❌ Analysis failed: {analysis_error}")
            return
            
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_analysis())
