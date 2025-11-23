## Diagnosis
- The TypeScript IntentParserAgent throws on 400 from Sudo (Gemini), causing the whole request to fail before reaching the Python optimization pipeline.
- Python intent parsing also returns 400 when Sudo fails; however, the new Python `/optimize-route` can accept raw `userInput` and do Gemini address resolution + Geocoding + Optimization without a separate parse step.

## Fix Plan
1. Node fallback to Python pipeline
- In `RouteOptimizationService.optimizeRoute`, if Python or TS intent parsing fails, call `pyOptimizeRoute({ userInput })` directly.
- This lets the Python pipeline resolve addresses with Gemini, geocode, and optimize routes end-to-end.
- Forward Python 400/422 payloads to the client so the UI shows actionable guidance.

2. Make TS IntentParserAgent resilient
- Catch Sudo 400 and perform rule-based parsing:
  - Extract starting city/state via regex (e.g., `in <City, State>`)
  - Detect tasks and brands/categories from keywords (“Walmart”, “gym”, “Chinese restaurant”, etc.)
  - Return `ParsedUserRequest` instead of throwing.

3. Add LLM health route (optional)
- Provide a minimal `/llm-health` endpoint to test Sudo connectivity and show status code/body for quick diagnostics.

## Verification
- Use “I’m in San Ramon, CA. I want Walmart (groceries), a gym, and a Chinese restaurant.”
- Expect:
  - If intent parse fails, Node calls Python `/optimize-route` with `userInput`.
  - Mapbox portal shows Geocoding + Optimization activity.
  - UI displays up to 5 route options with totals, per‑leg metrics, and geometry; on strict constraints with no POIs, UI shows guidance.

## Notes
- All Mapbox calls use `lon,lat` order in paths and arrays.
- Optimization API provides totals, per‑leg metrics, and geometry with `steps=true`, `geometries=geojson`, `overview=full`.
- Broad POI support (gym, restaurant, supermarket, bank, park, pharmacy, post office, coffee, etc.).