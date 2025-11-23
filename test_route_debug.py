import requests
import json

# Test the optimize-route endpoint with debug
url = "http://127.0.0.1:5050/optimize-route"
payload = {
    "userInput": "I am in San Ramon, CA. I need to go to Walmart for groceries. I want to go to the gym. I want to go to a chinese restaurant."
}

print(f"Sending request to: {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")
print("\nMaking request...")

try:
    response = requests.post(url, json=payload, timeout=60)
    print(f"\nStatus: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except requests.exceptions.Timeout:
    print("ERROR: Request timed out")
except requests.exceptions.ConnectionError as e:
    print(f"ERROR: Connection error: {e}")
except Exception as e:
    print(f"ERROR: {e}")
