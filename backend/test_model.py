#!/usr/bin/env python3
import sys

sys.path.insert(0, "/Users/nicholasvanlandschoot/Projects/Verita/AI_Intreview/backend")

from models import ProfileComplete
import pydantic

print("Pydantic version:", pydantic.VERSION)
print("\nProfileComplete fields:")
for name, field in ProfileComplete.model_fields.items():
    print(f"  {name}: required={field.is_required()}, default={field.default}")

# Test creating instance with minimal fields
print("\n--- Testing with minimal fields (name, bio, expertise) ---")
try:
    profile = ProfileComplete(name="Test User", bio="Test bio", expertise=["UI Design"])
    print("✓ SUCCESS: Created profile with minimal fields")
    print(f"  Profile: {profile.model_dump()}")
except Exception as e:
    print(f"✗ FAILED: {e}")
