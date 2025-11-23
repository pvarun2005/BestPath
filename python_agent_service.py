#!/usr/bin/env python3
import os
from dotenv import load_dotenv
import json
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# Load .env if present - override system environment variables
load_dotenv(override=True)

SUDO_API_KEY = os.getenv("SUDO_API_KEY", "")
SUDO_URL = os.getenv("GEMINI_API_URL", "https://sudoapp.dev/api/v1/chat/completions")
MAPBOX_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN", "")

def sudo_chat(messages, model="gemini-2.0-flash"):
    if not SUDO_API_KEY:
        return {"error": "SUDO_API_KEY not configured"}
    headers = {
        "Authorization": f"Bearer {SUDO_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
    }

    # Debug: Log the request
    import sys
    print(f"[SUDO_CHAT] Making request to: {SUDO_URL}", file=sys.stderr, flush=True)
    print(f"[SUDO_CHAT] Model: {model}", file=sys.stderr, flush=True)
    print(f"[SUDO_CHAT] API Key present: {bool(SUDO_API_KEY)}", file=sys.stderr, flush=True)
    print(f"[SUDO_CHAT] Message count: {len(messages)}", file=sys.stderr, flush=True)

    r = requests.post(SUDO_URL, headers=headers, json=payload, timeout=30)

    print(f"[SUDO_CHAT] Response status: {r.status_code}", file=sys.stderr, flush=True)
    if r.status_code != 200:
        print(f"[SUDO_CHAT] Error body: {r.text[:200]}", file=sys.stderr, flush=True)
        return {"error": f"HTTP {r.status_code}", "body": r.text}
    data = r.json()
    return data

def geocode(query, proximity=None, limit=5):
    if not MAPBOX_TOKEN:
        return []
    params = {
        "access_token": MAPBOX_TOKEN,
        "limit": limit,
        "types": "poi",
        "autocomplete": "true",
    }
    if proximity and len(proximity) == 2:
        params["proximity"] = f"{proximity[0]},{proximity[1]}"
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(query)}.json"
    r = requests.get(url, params=params, timeout=20)
    if r.status_code != 200:
        return []
    data = r.json()
    out = []
    for f in data.get("features", [])[:limit]:
        out.append({
            "latitude": f["center"][1],
            "longitude": f["center"][0],
            "address": f.get("place_name", query),
            "name": f.get("text", query)
        })
    return out

def geocode_start(query):
    if not MAPBOX_TOKEN:
        return []
    params = {
        "access_token": MAPBOX_TOKEN,
        "limit": 1,
        "types": "place,locality,region,district,address",
        "country": "us",
    }
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(query)}.json"
    r = requests.get(url, params=params, timeout=20)
    if r.status_code != 200:
        return []
    data = r.json()
    out = []
    for f in data.get("features", [])[:1]:
        out.append({
            "latitude": f["center"][1],
            "longitude": f["center"][0],
            "address": f.get("place_name", query),
            "name": f.get("text", query)
        })
    return out

def haversine(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, sqrt, atan2
    R = 6371000.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def deduplicate_locations(locations, min_distance_meters=50):
    """Remove duplicate locations that are within min_distance_meters of each other."""
    if not locations:
        return []

    deduped = []
    for loc in locations:
        is_duplicate = False
        for existing in deduped:
            distance = haversine(
                loc.get("latitude", 0),
                loc.get("longitude", 0),
                existing.get("latitude", 0),
                existing.get("longitude", 0)
            )
            if distance < min_distance_meters:
                is_duplicate = True
                break
        if not is_duplicate:
            deduped.append(loc)

    return deduped

def geocode_address(address):
    """
    Geocode an address and extract the business name from it.
    The address format from Gemini is: "Business Name, Street Address, City, State ZIP"
    We want to preserve the business name, not use Mapbox's text field.
    """
    if not MAPBOX_TOKEN:
        return None
    params = {
        "access_token": MAPBOX_TOKEN,
        "limit": 1,
    }
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(address)}.json"
    r = requests.get(url, params=params, timeout=20)
    if r.status_code != 200:
        return None
    data = r.json()
    features = data.get("features", [])
    if not features:
        return None
    f = features[0]

    # Extract business name from the original address (before the first comma)
    # Format: "Business Name, Street Address, City, State ZIP"
    business_name = address.split(",")[0].strip() if "," in address else f.get("text", address)

    return {
        "latitude": f["center"][1],
        "longitude": f["center"][0],
        "address": f.get("place_name", address),
        "name": business_name  # Use the business name from Gemini instead of Mapbox's street name
    }

def optimized_trip(coords, source_first=True, destination_last=False):
    if not MAPBOX_TOKEN or len(coords) < 2:
        return None
    coords_str = ";".join([f"{lon},{lat}" for lon, lat in coords])
    url = f"https://api.mapbox.com/optimized-trips/v1/mapbox/driving-traffic/{coords_str}"
    params = {
        "access_token": MAPBOX_TOKEN,
        "steps": "true",
        "geometries": "geojson",
        "overview": "full",
    }
    if source_first:
        params["source"] = "first"
    if destination_last:
        params["destination"] = "last"
    r = requests.get(url, params=params, timeout=30)
    if r.status_code != 200:
        return None
    return r.json()

def directions_waypoints(coords):
    if not MAPBOX_TOKEN or len(coords) < 2:
        return None
    coords_str = ";".join([f"{lon},{lat}" for lon, lat in coords])
    url = f"https://api.mapbox.com/directions/v5/mapbox/driving-traffic/{coords_str}"
    params = {
        "access_token": MAPBOX_TOKEN,
        "geometries": "geojson",
        "overview": "full",
        "annotations": "duration,distance"
    }
    r = requests.get(url, params=params, timeout=30)
    if r.status_code != 200:
        return None
    return r.json()

@app.route("/health")
def health():
    return jsonify({
        "success": True,
        "sudo": "configured" if SUDO_API_KEY else "not configured",
    })

@app.route("/intent", methods=["POST"])
def intent():
    body = request.json or {}
    text = body.get("text", "")
    system = (
        "You are a task parser. Extract starting location, tasks, and preferences."
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": text},
    ]
    data = sudo_chat(messages)
    if "error" in data:
        return jsonify({"success": False, "error": data["error"], "body": data.get("body")}), 400
    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content", "")
    )
    return jsonify({"success": True, "content": content, "raw": data})

@app.route("/optimize", methods=["POST"])
def optimize():
    body = request.json or {}
    text = body.get("text", "")
    messages = [{"role": "user", "content": text}]
    data = sudo_chat(messages)
    if "error" in data:
        return jsonify({"success": False, "error": data["error"], "body": data.get("body")}), 400
    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content", "")
    )
    return jsonify({"success": True, "content": content, "raw": data})

def calculate_preference_score(task_order):
    score = 50
    for item in task_order:
        prefs = item.get("task", {}).get("preferences", [])
        loc = item.get("location", {})
        # Mandatory
        satisfied_mandatory = [p for p in prefs if p.get("isMandatory") and (
            (p.get("type") == "location" and (p.get("value","" ).lower() in loc.get("name","" ).lower() or p.get("value","" ).lower() in loc.get("address","" ).lower())) or
            (p.get("type") == "chain" and p.get("value","" ).lower() in loc.get("name","" ).lower())
        )]
        score += len(satisfied_mandatory) * 20
        # Preferred
        satisfied_preferred = [p for p in prefs if not p.get("isMandatory") and (
            (p.get("type") == "chain" and p.get("value","" ).lower() in loc.get("name","" ).lower()) or
            (p.get("type") == "category" and (p.get("value","" ).lower() in loc.get("name","" ).lower() or p.get("value","" ).lower() in loc.get("address","" ).lower()))
        )]
        score += len(satisfied_preferred) * 10
    return max(0, min(100, score))

def assess_traffic_factor(route):
    try:
        total_d = route["distance"]
        total_t = route["duration"]
        expected_speed_kmh = (total_d / total_t) * 3.6
        if expected_speed_kmh < 20:
            return "high"
        if expected_speed_kmh < 40:
            return "medium"
        return "low"
    except Exception:
        return "medium"

def estimate_gas_cost(distance_m):
    miles = distance_m * 0.000621371
    return round(miles * 0.15, 2)

@app.route("/optimize-route", methods=["POST"])
def optimize_route():
    import sys
    body = request.json or {}

    # Write to log file directly
    with open("debug.log", "a") as log:
        log.write(f"\n{'='*80}\n")
        log.write(f"NEW REQUEST AT {__import__('datetime').datetime.now()}\n")
        log.write(f"{'='*80}\n")
        log.write(f"Body: {body}\n")
        log.flush()
    parsed_json = {}
    # Prefer structured payload from Node to avoid re-parsing raw text
    starting_address = body.get("startingAddress") or ""
    tasks = body.get("tasks") or []
    print(f"Starting address from body: {starting_address}", file=sys.stderr, flush=True)
    print(f"Tasks from body: {tasks}", file=sys.stderr, flush=True)
    if not starting_address:
        # Fallback: try raw text via LLM with structured prompt
        user_input = body.get("userInput", "")
        intent_messages = [
            {
                "role": "system",
                "content": """Extract starting location, tasks, and preferences from user input.
Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "startingLocation": "City, State",
  "tasks": [
    {
      "type": "gym|groceries|restaurant|custom",
      "description": "brief description",
      "preferences": [
        {"type": "chain|category|location", "value": "specific value", "isMandatory": true|false}
      ]
    }
  ],
  "optimizeFor": "time|distance|preferences"
}"""
            },
            {"role": "user", "content": user_input},
        ]
        parsed = sudo_chat(intent_messages)
        content = parsed.get("choices", [{}])[0].get("message", {}).get("content", "")

        # Debug: Log what Gemini returned for intent parsing
        import sys
        print(f"\n[INTENT PARSING] Gemini Response:", file=sys.stderr, flush=True)
        print(f"  Raw content: {content[:500]}", file=sys.stderr, flush=True)
        if "error" in parsed:
            print(f"  ERROR in Gemini response: {parsed['error']}", file=sys.stderr, flush=True)

        try:
            import re, json as pyjson
            # Try to extract JSON from response
            m = re.search(r"\{[\s\S]*\}", content)
            if m:
                parsed_json = pyjson.loads(m.group(0))
                print(f"  Parsed JSON successfully:", file=sys.stderr, flush=True)
                print(f"    Starting Location: {parsed_json.get('startingLocation')}", file=sys.stderr, flush=True)
                print(f"    Tasks: {parsed_json.get('tasks')}", file=sys.stderr, flush=True)
            else:
                print(f"  ERROR: No JSON object found in response", file=sys.stderr, flush=True)
                parsed_json = {}
        except Exception as e:
            print(f"  ERROR parsing JSON: {e}", file=sys.stderr, flush=True)
            parsed_json = {}
        starting_address = parsed_json.get("startingLocation") or starting_address
        tasks = tasks or parsed_json.get("tasks") or []

    attempts = [
        starting_address,
        f"{starting_address}, USA",
        starting_address.replace(", CA", ", California"),
        starting_address.replace(", CA", ", California, USA"),
    ]
    start_candidates = []
    for q in attempts:
        start_candidates = geocode_start(q)
        if start_candidates:
            break
    if not start_candidates:
        return jsonify({"success": False, "error": "Starting location not found", "attempts": attempts}), 400
    start = start_candidates[0]
    import sys
    print(f"\n=== DEBUG: Starting location found: {start}", file=sys.stderr, flush=True)
    print(f"=== DEBUG: Number of tasks: {len(tasks)}", file=sys.stderr, flush=True)
    print(f"=== DEBUG: Tasks: {tasks}", file=sys.stderr, flush=True)
    location_options = []
    for task in tasks:
        import sys
        print(f"\n{'='*60}", file=sys.stderr, flush=True)
        print(f"TASK PROCESSING START", file=sys.stderr, flush=True)
        print(f"{'='*60}", file=sys.stderr, flush=True)
        print(f"Task: {task}", file=sys.stderr, flush=True)

        ttype = (task.get("type") or "").lower()
        prefs = task.get("preferences") or []
        brand = next((p.get("value") for p in prefs if p.get("type") in ("location","chain")), None)
        max_items = 3
        brand_text = f"{brand} " if brand else ""

        print(f"Type: {ttype}", file=sys.stderr, flush=True)
        print(f"Brand: {brand}", file=sys.stderr, flush=True)
        print(f"Preferences: {prefs}", file=sys.stderr, flush=True)

        # Build the query for Gemini
        gemini_query = f"Get me top {max_items} addresses of {brand_text}{ttype} in or near {start.get('address')}"
        print(f"\n[STAGE 1] Gemini Query:", file=sys.stderr, flush=True)
        print(f"  Query: {gemini_query}", file=sys.stderr, flush=True)

        # Ask Gemini for specific addresses in the correct format for geocoding
        prompt = {
            "role": "system",
            "content": f"""You are a local business address finder. Return ONLY a JSON array of exactly {max_items} real {brand_text}{ttype} addresses in or near {start.get('name')}, {start.get('address')}.

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
            "content": gemini_query
        }
        data = sudo_chat([prompt, userq])
        addresses = []

        print(f"\n[STAGE 2] Gemini Response:", file=sys.stderr, flush=True)
        if "error" in data:
            print(f"  ERROR: {data['error']}", file=sys.stderr, flush=True)
        else:
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"  Raw content: {content[:300]}...", file=sys.stderr, flush=True)

            try:
                # Remove markdown code blocks if present
                content = content.strip()
                if content.startswith("```"):
                    lines = content.split("\n")
                    content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
                # Try to extract JSON array
                import re
                array_match = re.search(r'\[[\s\S]*\]', content)
                if array_match:
                    parsed = json.loads(array_match.group(0))
                    if isinstance(parsed, list):
                        addresses = parsed[:max_items]
                        print(f"  Parsed {len(addresses)} addresses:", file=sys.stderr, flush=True)
                        for i, addr in enumerate(addresses):
                            print(f"    {i+1}. {addr}", file=sys.stderr, flush=True)
                else:
                    print(f"  ERROR: No JSON array found in response", file=sys.stderr, flush=True)
            except Exception as e:
                print(f"  ERROR parsing: {e}", file=sys.stderr, flush=True)
                print(f"  Content was: {content[:500]}", file=sys.stderr, flush=True)
                addresses = []

        # Now geocode each address Gemini provided
        print(f"\n[STAGE 3] Geocoding {len(addresses)} addresses:", file=sys.stderr, flush=True)
        geocoded = []
        for idx, addr in enumerate(addresses):
            # Handle both string addresses and dict format
            if isinstance(addr, dict):
                addr = addr.get("address", "")
            if not addr or not isinstance(addr, str):
                print(f"  {idx+1}. SKIPPED (invalid format): {addr}", file=sys.stderr, flush=True)
                continue

            print(f"  {idx+1}. Geocoding: {addr}", file=sys.stderr, flush=True)
            g = geocode_address(addr)
            if g:
                g["type"] = ttype
                geocoded.append(g)
                print(f"     SUCCESS: lat={g['latitude']:.4f}, lon={g['longitude']:.4f}", file=sys.stderr, flush=True)
            else:
                print(f"     FAILED to geocode", file=sys.stderr, flush=True)

        # Deduplicate locations that are too close together
        geocoded = deduplicate_locations(geocoded, min_distance_meters=100)

        print(f"\n[STAGE 4] After Deduplication:", file=sys.stderr, flush=True)
        print(f"  Remaining locations: {len(geocoded)}", file=sys.stderr, flush=True)
        for i, loc in enumerate(geocoded[:3]):
            print(f"    {i+1}. {loc['name']} - lat={loc['latitude']:.4f}, lon={loc['longitude']:.4f}", file=sys.stderr, flush=True)

        # Every task must have at least one location - if not, that's an error
        if not geocoded:
            error_msg = f"Could not find any locations for task: {task.get('description', ttype)}"
            print(f"\n  ERROR: {error_msg}", file=sys.stderr, flush=True)
            with open("debug.log", "a") as log:
                log.write(f"ERROR: {error_msg}\n")
                log.write(f"Task was: {task}\n")
                log.flush()
            return jsonify({"success": False, "error": error_msg, "task": task}), 422

        location_options.append({"task": task, "locations": geocoded[:3]})
        print(f"\n  Added to location_options (using top 3)", file=sys.stderr, flush=True)
        print(f"{'='*60}\n", file=sys.stderr, flush=True)

    # Prepare combinations - take top 2 closest locations for each task
    routes = []
    from itertools import product
    filtered = []

    print(f"\n[STAGE 5] Preparing Route Combinations:", file=sys.stderr, flush=True)
    print(f"  Total tasks with locations: {len(location_options)}", file=sys.stderr, flush=True)

    for opts in location_options:
        locs = opts["locations"][:2]  # Take top 2 locations per task
        if not locs:
            # This should never happen because we check earlier, but just in case
            error_msg = f"No locations found for task: {opts['task'].get('description')}"
            print(f"  ERROR: {error_msg}", file=sys.stderr, flush=True)
            return jsonify({"success": False, "error": error_msg}), 422

        # Sort by distance from starting location
        locs_sorted = sorted(locs, key=lambda L: haversine(start["latitude"], start["longitude"], L["latitude"], L["longitude"]))
        filtered.append(locs_sorted[:2])
        print(f"  Task '{opts['task'].get('type')}': {len(locs_sorted[:2])} locations", file=sys.stderr, flush=True)

    if not filtered:
        return jsonify({"success": False, "error": "No locations found for any task"}), 422
    for combo in product(*filtered):
        coords = [(start["longitude"], start["latitude"])] + [(c["longitude"], c["latitude"]) for c in combo]
        ot = optimized_trip(coords, source_first=True, destination_last=False)
        if not ot or not ot.get("trips"):
            continue
        trip = ot["trips"][0]
        task_order = []
        for i, c in enumerate(combo):
            task_order.append({"task": location_options[i]["task"], "location": c})
        pref_score = calculate_preference_score(task_order)
        routes.append({
            "id": f"route-{len(routes)+1}",
            "stops": combo,
            "totalDistance": trip.get("distance"),
            "totalDuration": trip.get("duration"),
            "legs": trip.get("legs", []),
            "geometry": trip.get("geometry"),
            "preferenceScore": pref_score,
        })

    # Sort by shortest duration first, then by preference score as tiebreaker
    routes = sorted(routes, key=lambda r: (r["totalDuration"], -r["preferenceScore"]))[:5]
    if not routes:
        return jsonify({"success": False, "error": "No route combinations found"}), 422

    return jsonify({
        "success": True,
        "parsedRequest": {
            "startingLocation": start,
            "tasks": tasks,
            "preferences": [p for t in tasks for p in (t.get("preferences") or [])],
            "optimizeFor": (parsed_json.get("optimizeFor") if isinstance(parsed_json, dict) else None) or "preferences"
        },
        "routes": routes
    })

if __name__ == "__main__":
    # Disable debug mode so our print statements show up
    app.run(host="0.0.0.0", port=5050, debug=False)