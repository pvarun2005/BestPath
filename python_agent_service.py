#!/usr/bin/env python3
import os
from dotenv import load_dotenv
import json
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# Load .env if present
load_dotenv()

SUDO_API_KEY = os.getenv("SUDO_API_KEY", "")
SUDO_URL = os.getenv("GEMINI_API_URL", "https://sudoapp.dev/api/v1/chat/completions")
MAPBOX_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN", "")

def sudo_chat(messages, model="gemini-1.5-flash"):
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
    r = requests.post(SUDO_URL, headers=headers, json=payload, timeout=30)
    if r.status_code != 200:
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

def geocode_address(address):
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
    return {
        "latitude": f["center"][1],
        "longitude": f["center"][0],
        "address": f.get("place_name", address),
        "name": f.get("text", address)
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
    body = request.json or {}
    parsed_json = {}
    # Prefer structured payload from Node to avoid re-parsing raw text
    starting_address = body.get("startingAddress") or ""
    tasks = body.get("tasks") or []
    if not starting_address:
        # Fallback: try raw text via LLM
        user_input = body.get("userInput", "")
        intent_messages = [
            {"role": "system", "content": "Extract starting location and task list with preferences."},
            {"role": "user", "content": user_input},
        ]
        parsed = sudo_chat(intent_messages)
        content = parsed.get("choices", [{}])[0].get("message", {}).get("content", "")
        try:
            import re, json as pyjson
            m = re.search(r"\{[\s\S]*\}", content)
            parsed_json = pyjson.loads(m.group(0)) if m else {}
        except Exception:
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
    location_options = []
    for task in tasks:
        ttype = (task.get("type") or "").lower()
        prefs = task.get("preferences") or []
        brand = next((p.get("value") for p in prefs if p.get("type") in ("location","chain")), None)
        max_items = 3
        prompt = {
            "role": "system",
            "content": "Return JSON array of top places near the given city/state for the requested category/brand. Use fields: name,address,city,state."
        }
        userq = {
            "role": "user",
            "content": json.dumps({
                "city": start.get("name"),
                "address": start.get("address"),
                "category": ttype,
                "brand": brand,
                "max": max_items
            })
        }
        data = sudo_chat([prompt, userq])
        items = []
        if "error" not in data:
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            try:
                parsed = json.loads(content)
                if isinstance(parsed, list):
                    items = parsed[:max_items]
            except Exception:
                items = []
        geocoded = []
        for it in items:
            addr = it.get("address")
            if not addr:
                continue
            g = geocode_address(addr)
            if g:
                g["type"] = ttype
                geocoded.append(g)
        if not geocoded and any(p.get("isMandatory") for p in prefs):
            return jsonify({"success": False, "error": "Mandatory task has no valid addresses", "task": task}), 422
        location_options.append({"task": task, "locations": geocoded[:3]})

    routes = []
    from itertools import product
    filtered = []
    for opts in location_options:
        locs = opts["locations"][:2]
        if locs:
            locs_sorted = sorted(locs, key=lambda L: haversine(start["latitude"], start["longitude"], L["latitude"], L["longitude"]))
            filtered.append(locs_sorted[:2])
        else:
            if opts["task"].get("isMandatory"):
                return jsonify({"success": False, "error": "Mandatory task has no nearby locations", "task": opts["task"]}), 422
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

    routes = sorted(routes, key=lambda r: (r["preferenceScore"] * 0.6 + (1 / max(r["totalDuration"], 1)) * 0.4), reverse=True)[:5]
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
    app.run(host="0.0.0.0", port=5050, debug=True)