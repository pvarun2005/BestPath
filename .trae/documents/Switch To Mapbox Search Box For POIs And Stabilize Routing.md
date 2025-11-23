## Data Flow
1. Parse input → extract start city/state, categories/brands, ordering, mandatory vs preferred
2. Gemini via Sudo → return top N addresses per category/brand near start
3. Mapbox Geocoding → convert addresses to lat/lon
4. Generate combinations → build candidate waypoint sets (respect order if provided)
5. Mapbox Optimization → compute best order with `steps=true`, `geometries=geojson`, `overview=full`
6. Rank & return → top 5 routes with totals, per‑leg metrics, geometry

## APIs
- Geocoding: `GET /geocoding/v5/mapbox.places/{address}.json?access_token=...`
- Optimization: `GET /optimized-trips/v1/mapbox/driving-traffic/{lon,lat;...}?steps=true&geometries=geojson&overview=full&access_token=...`
- Gemini (Sudo): `POST https://sudoapp.dev/api/v1/chat/completions` (Bearer `SUDO_API_KEY`) → JSON `{name,address,city,state}`

## Python Service
- `/resolve-pois` → calls Gemini, validates addresses, returns groups `{type, items}`
- `/optimize-trip` → geocode addresses, build combinations, call Optimization per candidate, score & return up to 5 routes `{id, totalDistance, totalDuration, legs[], geometry, stops[]}`
- Errors: 400 (start not found, with attempted queries), 422 (mandatory task 0 POIs, or no routes) with guidance

## Node Backend
- RouteOptimizationService → orchestrates `/resolve-pois` then `/optimize-trip`
- Forward 422 details to UI; add `/llm-health` for Sudo connectivity check

## UI
- Render up to 5 routes: totals, per‑leg metrics, map geometry
- Show actionable guidance on 422 (e.g., relax brand, broaden category)

## Config
- `.env`: `MAPBOX_ACCESS_TOKEN`, `SUDO_API_KEY`, `GEMINI_API_URL=https://sudoapp.dev/api/v1/chat/completions`

## Verification
- Scenarios: city‑only categories; strict brands; varied ordering; confirm Mapbox portal activity (Geocoding + Optimization)

## Notes
- Broad POI support (gym, restaurant, supermarket, bank, park, pharmacy, post office, coffee, etc.)
- Optimization API provides totals and per‑leg metrics/geometry; no separate Directions call required