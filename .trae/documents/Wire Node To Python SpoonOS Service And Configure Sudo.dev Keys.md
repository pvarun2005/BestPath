## Implementation Overview
- Add a Node client to call Python agent endpoints (`/intent`, `/optimize`).
- Update `RouteOptimizationService` to use Python for intent parsing when `USE_PY_AGENT=true`; keep Mapbox routing in Node.
- Start Python service, verify health, and run end-to-end optimization with your keys.

## Files To Update/Add
1. `api/utils/pythonAgent.ts`: Axios wrapper for `PY_AGENT_URL` endpoints.
2. `api/services/RouteOptimizationService.ts`: Use Python client for intent parsing behind a config flag; transform response to `ParsedUserRequest`.
3. Optional: Add `/api/routes/test-python` route for quick connectivity checks.

## Env & Startup
- `.env` already contains: `SUDO_API_KEY`, `GEMINI_API_URL`, `MAPBOX_ACCESS_TOKEN`.
- Add: `PY_AGENT_URL=http://127.0.0.1:5050`, `USE_PY_AGENT=true`.
- Start Python service; then run Node dev and verify.

## Verification Steps
- Check Python `/health` returns configured.
- Call Node `/api/routes/health` shows gemini and mapbox configured.
- POST `/api/routes/optimize-route` with natural input; confirm parsed intent and 3–5 route options.

## Next (Optional)
- Install spoon-core and move route orchestration fully into Python using real `LLMManager` and graphs.
