## Diagnosis
- The Python optimizer returned `400 Starting location not found`. This comes from our `geocode()` returning no features for the city query, causing early exit.
- Root cause: We globally set `types=poi` in `geocode()`. City names like “San Ramon, CA” aren’t POIs, so Mapbox returns zero features. We must use place/locality/address types for starting locations.
- Secondary issue: If any task yields zero POIs (e.g., specific gym chain not nearby), the product-of-locations is empty, so `routes` is `[]` even with 200.

## Fix Plan
1. Split geocoding functions:
- `geocode_start(query)`: use types suited for places:
  - `types=place,locality,region,district,address`
  - `limit=1`
  - fallback expansions: `"San Ramon, CA, USA"`, add `country=US` and try again
- `geocode_poi(query, proximity, limit)`: keep `types=poi`, `autocomplete=true` for task locations.

2. Starting location resolution:
- In `/optimize-route`, call `geocode_start(starting_address)`
- If 0 results, try normalized variants:
  - `"{city}, CA" → "{city}, California" → "{city}, California, USA"`
  - Add `country=US` param
- Detailed logging: include the query and attempted fallbacks in the 400 response for easier debugging.

3. Robust task location fallback:
- For each task, try preferred chain/category first; if no results, back off to generic queries:
  - Groceries: `Walmart` → `grocery store` → `supermarket`
  - Gym: `Equinox`/`24 Hour Fitness` → `gym` → `fitness center`
  - Restaurant: `{cuisine} restaurant` → `restaurant`
- Try proximity search first; if no results, global search without proximity.
- Ensure we always have at least one candidate per task; if still none, return `422` with a list of tasks that failed and suggested relaxations (UI can show a toast).

4. UI feedback improvement (Node response shaping):
- If Python returns `routes=[]`, Node should send a friendly explanation (e.g., “No nearby matches for Equinox found; try allowing any gym”).
- Keep success vs error semantics consistent: use `422` for “no routes possible”, not `200`.

5. Verification
- Test inputs:
  - “San Ramon, CA” with Walmart + Equinox + Chinese → expect 3–5 routes with Walmart, nearest gym (Equinox if found, else generic), Chinese restaurants.
  - Edge cases: small towns; verify fallbacks produce routes.
- Health: Node and Python health endpoints show configured; logs confirm delegation.

## Confidence
- High: Splitting geocode types and adding fallbacks will resolve the starting location failure.
- High: Backoff strategy for task POIs will significantly reduce empty-route cases.
- Medium: Some chains may genuinely have no nearby locations; the 422 + guidance improves UX.

## Implementation Steps
- Modify `python_agent_service.py` to add `geocode_start` (place types) and refactor `geocode_poi` (poi types).
- Update `/optimize-route` to use `geocode_start`, fallback expansions, and robust POI retrieval with proximity + global retries.
- Adjust Node to return 422 when `routes` is empty, with a message summarizing task POI misses.
- Add logging for start query and task query attempts.

## No State Changes Yet
- This is the plan. After your approval, I’ll implement, restart services, and verify end-to-end with your San Ramon input.