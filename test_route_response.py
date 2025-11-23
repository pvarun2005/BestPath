#!/usr/bin/env python3
import requests
import json

# Test the optimize-route endpoint to see what data we're getting
url = "http://127.0.0.1:5050/optimize-route"
payload = {
    "userInput": "I am in San Ramon, CA. I need to go to Walmart for groceries. I want to go to the gym. I want to go to a chinese restaurant."
}

response = requests.post(url, json=payload)
print(f"Status Code: {response.status_code}")
print("\nResponse JSON:")
result = response.json()
print(json.dumps(result, indent=2))

# Check if routes have legs
if result.get("success") and result.get("routes"):
    print("\n=== CHECKING LEGS DATA ===")
    for i, route in enumerate(result["routes"]):
        print(f"\nRoute {i+1} (ID: {route.get('id')}):")
        print(f"  Has 'legs' key: {'legs' in route}")
        if 'legs' in route:
            print(f"  Number of legs: {len(route['legs'])}")
            if route['legs']:
                print(f"  First leg has 'steps': {'steps' in route['legs'][0]}")
                if 'steps' in route['legs'][0]:
                    print(f"  First leg step count: {len(route['legs'][0]['steps'])}")
                    if route['legs'][0]['steps']:
                        first_step = route['legs'][0]['steps'][0]
                        print(f"  First step instruction: {first_step.get('maneuver', {}).get('instruction', 'N/A')}")
