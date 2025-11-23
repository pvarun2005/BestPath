## Overview
Build an end‑to‑end pipeline that uses Gemini to discover addresses, Mapbox Geocoding to convert to coordinates, and Mapbox Optimization (with steps and geometry) to compute and return up to 5 best routes with per‑leg metrics and full geometry.

## Data Flow
1. Parse input → extract start city/state, categories/brands, ordering, mandatory vs preferred
2. Gemini via Sudo → return top N addresses per category/brand near start
3. Mapbox Geocoding → convert addresses to lat/lon
4. Generate combinations → build candidate waypoint sets (respect order if provided)
5. Mapbox Optimization → compute best order with `steps=true`, `geometries=geojson`, `overview=full`
6. Rank & return → top 5 routes with totals, per‑leg metrics, geometry

## API Usage & Formats
### Gemini (Sudo)
- Endpoint: `POST https://sudoapp.dev/api/v1/chat/completions`
- Auth: `Authorization: Bearer ${SUDO_API_KEY}`
- Prompt: return JSON array per category/brand near `[city, state]`: `{ name, address, city, state }`
- Output validation: ensure city/state match; normalize addresses; dedupe

### Mapbox Geocoding
- Endpoint: `GET https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json?access_token=${MAPBOX_ACCESS_TOKEN}`
- Read: `features[i].center => [lon, lat]`
- Store POI: `{ name, address, latitude: center[1], longitude: center[0] }`

### Mapbox Optimization (route details)
- Endpoint: `GET https://api.mapbox.com/optimized-trips/v1/mapbox/driving-traffic/{lon,lat;lon,lat;...}`
- Params: `steps=true&geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`
- Optional: `source=first&destination=last` when user fixes start/end/order
- Read totals: `trips[0].distance`, `trips[0].duration`
- Read legs: `trips[0].legs[i].distance`, `trips[0].legs[i].duration`, `trips[0].legs[i].steps`
- Geometry: `trips[0].geometry` (GeoJSON)
- Coordinate order: always `lon,lat` in path and arrays

## Categories & Brands Supported
- Categories: gym, restaurant (cuisines), supermarket/groceries, bank, park, pharmacy, post office, coffee, etc.
- Brands: Walmart, Target, Costco, Chase, Equinox, 24 Hour Fitness, Safeway, etc.
- Mandatory vs preferred: treat brands/categories as preferred unless user uses strong requirement terms (must/only/exactly/required/have to/need to)

## Implementation
### Python Service
- `/resolve-pois`
  - Input: `{ startCity, startState, tasks: [{ type: 'gym'|'restaurant'|'bank'|'park'|..., brand?: string, max?: number }] }`
  - Action: prompt Gemini, return structured JSON addresses per task, validate city/state
  - Output: `{ pois: [{ type, items: [{ name, address, city, state }] }] }`

- `/optimize-trip`
  - Input: `{ startAddress, poiGroups: [{ type, items: [{ name, address }] }], order?: string[], maxRoutes?: number }`
  - Actions:
    - Geocode each address via Geocoding, store `{ name, address, latitude, longitude }`
    - Generate combinations across groups (respect order if provided)
    - For each combination, call Optimization with waypoints:
      - Build `lon,lat;lon,lat;...` path; include `source=first`/`destination=last` when applicable
      - `steps=true&geometries=geojson&overview=full`
    - Score by total duration/distance and preference satisfaction; sort and take top `maxRoutes` (default 5)
  - Output: `{ routes: [{ id, totalDistance, totalDuration, legs: [{ distance, duration, steps }], geometry, stops: [{ name,address,latitude,longitude,type }] }] }`
  - Errors:
    - 400: start geocoding failed; include attempted queries
    - 422: mandatory task 0 valid POIs, or no combinations produced routes; include `{task, triedQueries, suggestion}`

### Node Backend
- Orchestrates `/resolve-pois` then `/optimize-trip`
- Forwards 422 details to UI; adds `/llm-health` to check Sudo connectivity (status + sample body)

### UI
- Render up to 5 route cards with totals, per‑leg metrics, and geometry
- Show guidance on 422 (e.g., relax brand, broaden category)

## Config
- `.env`: `MAPBOX_ACCESS_TOKEN`, `SUDO_API_KEY`, `GEMINI_API_URL=https://sudoapp.dev/api/v1/chat/completions`
- Mapbox token needs Geocoding + Optimization access (standard public token)

## Verification
- Scenario: “I’m in San Ramon, CA; Walmart; gym; Chinese restaurant” → expect Geocoding + Optimization activity in Mapbox portal and up to 5 route options in UI
- Scenario: strict brand missing → 422 with actionable guidance

## Notes
- Always maintain `lon,lat` ordering in Optimization path and use Geocoding `center[0]` as longitude, `center[1]` as latitude
- Avoid Directions API unless we need alt‑route features beyond Optimization

## Ready to proceed
On approval, I’ll implement both Python endpoints, wire the Node service, and update the UI to present routes and guidance.