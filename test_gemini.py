#!/usr/bin/env python3
import requests
import json

API_KEY = "205cf00efde7d96656ec40a8d7af1b38ca85bc58e6cd661b54688c1de6891d71"
API_URL = "https://sudoapp.dev/api/v1/chat/completions"

# Test Gemini address lookup
prompt = {
    "role": "system",
    "content": """You are a local business address finder. Return ONLY a JSON array of exactly 3 real Walmart groceries addresses in or near San Ramon, San Ramon, California.

CRITICAL: Return addresses in this EXACT format that works with geocoding APIs:
"Business Name, Street Address, City, State ZIP"

Example:
[
  "Walmart Supercenter, 2551 San Ramon Valley Blvd, San Ramon, CA 94583",
  "Target, 3141 Crow Canyon Pl, San Ramon, CA 94583"
]

Return ONLY the JSON array, no markdown, no extra text. Use real businesses with complete addresses including ZIP codes."""
}
userq = {
    "role": "user",
    "content": "Get me top 3 addresses of Walmart groceries in or near San Ramon, California"
}

payload = {
    "model": "gemini-2.0-flash",
    "messages": [prompt, userq]
}

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("Sending request to Gemini...")
response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    print(f"\nRaw Response:\n{content}\n")

    # Try to parse it
    import re
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1]) if len(lines) > 2 else content

    array_match = re.search(r'\[[\s\S]*\]', content)
    if array_match:
        addresses = json.loads(array_match.group(0))
        print(f"Parsed {len(addresses)} addresses:")
        for i, addr in enumerate(addresses):
            print(f"  {i+1}. {addr}")
    else:
        print("ERROR: Could not find JSON array in response")
else:
    print(f"ERROR: {response.text}")
