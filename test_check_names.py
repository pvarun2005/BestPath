import requests
import json

# Test the optimize-route endpoint
url = "http://127.0.0.1:5050/optimize-route"
payload = {
    "userInput": "I am in San Ramon, CA. I need to go to Walmart for groceries. I want to go to the gym. I want to go to a chinese restaurant."
}

response = requests.post(url, json=payload)
print(f"Status: {response.status_code}\n")

if response.status_code == 200:
    data = response.json()
    routes = data.get("routes", [])

    if routes:
        print(f"Found {len(routes)} routes\n")
        print("=" * 60)
        print("First Route Stops:")
        print("=" * 60)

        first_route = routes[0]
        stops = first_route.get("stops", [])

        for i, stop in enumerate(stops, 1):
            print(f"\n{i}. {stop.get('name')}")
            print(f"   Address: {stop.get('address')}")
            print(f"   Type: {stop.get('type')}")
