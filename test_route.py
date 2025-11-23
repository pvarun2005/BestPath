import requests
import json

# Test the optimize-route endpoint
url = "http://127.0.0.1:5050/optimize-route"
payload = {
    "userInput": "I am in San Ramon, CA. I need to go to Walmart for groceries. I want to go to the gym. I want to go to a chinese restaurant."
}

response = requests.post(url, json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
