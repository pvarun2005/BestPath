import requests
import json

url = "http://127.0.0.1:5050/optimize-route"
payload = {
    "userInput": "I am in San Ramon, CA. I need to go to Walmart for groceries. I want to go to the gym. I want to go to a chinese restaurant."
}

response = requests.post(url, json=payload)
if response.status_code == 200:
    data = response.json()
    routes = data.get("routes", [])
    if routes:
        first_route = routes[0]
        legs = first_route.get("legs", [])

        print(f"Route has {len(legs)} legs")

        if legs:
            print("\nFirst leg structure:")
            print(json.dumps(legs[0], indent=2))
