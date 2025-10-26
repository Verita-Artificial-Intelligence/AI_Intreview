import requests
import json

# First, let's test without auth to see the error
url = "http://localhost:8001/api/users/profile/complete"
data = {"name": "Test User", "bio": "Test bio", "expertise": ["UI Design"]}

print("Testing profile completion endpoint...")
print(f"URL: {url}")
print(f"Data: {json.dumps(data, indent=2)}")

# We need a token, but let's just see what happens
headers = {"Content-Type": "application/json"}
response = requests.put(url, json=data, headers=headers)

print(f"\nResponse status: {response.status_code}")
print(f"Response body: {json.dumps(response.json(), indent=2)}")
