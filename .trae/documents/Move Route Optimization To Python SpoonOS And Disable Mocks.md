## Benefits Over Current Setup
- Authentic SpoonOS: Use real `LLMManager`, graph workflows, and MCP tool patterns in Python instead of mimicking agents in Node.
- Strong orchestration: Supervisor/graph-driven steps for parsing → geocoding → directions → ranking with human-in-the-loop hooks.
- Reliability: Centralized LLM provider management (fallbacks, prompt caching for Anthropic where applicable), clearer state handling.
- Hackathon alignment: Demonstrably uses actual SpoonOS patterns plus Sudo Gemini via `chat/completions` only.

## What Changes Functionally
- Route optimization logic (geocoding + directions + preference scoring) migrates to Python SpoonOS service.
- Node/Express delegates both intent parsing and route optimization to Python endpoints; React stays unchanged.
- Mapbox calls move from `LocationFinderAgent.ts`/`RouteOptimizerAgent.ts` (Node) into Python service (via REST calls to Mapbox APIs).
- Single configuration source for LLM and tool calls in Python; Node becomes a thin API façade.

## Current Mock Usage Diagnosis
- Mock mode is active if:
  - `RouteOptimizationService.ts:21` `useMockData = !config.mapboxAccessToken || config.mapboxAccessToken === 'your_mapbox_access_token_here'` → triggers `MockLocationFinderAgent` and `MockRouteOptimizerAgent` (`RouteOptimizationService.ts:25–39`).
  - Gemini mock: `api/utils/config.ts:14–21` returns `{ apiKey: 'demo-key', apiUrl: 'mock' }` when key missing/placeholder, printing '📝 Using mock Gemini responses for demo'.
- Log evidence: Server output shows '📝 Using mock Gemini responses for demo' and '📝 Using mock location data for demo'. That indicates missing/placeholder keys or incorrect URL.

## Disable Mocks (No Code Changes)
- In `.env` at project root:
  - `SUDO_API_KEY=<your_sudo_key>` (must be non-empty and not a placeholder)
  - `GEMINI_API_URL=https://sudoapp.dev/api/v1/chat/completions`
  - `MAPBOX_ACCESS_TOKEN=<your_mapbox_token>` (non-empty)
  - `PY_AGENT_URL=http://127.0.0.1:5050`, `USE_PY_AGENT=true`
- Restart Node and Python services to apply.

## Implementation Plan To Move Optimization To Python
1. Python endpoints:
  - `/optimize-route`: Accept starting address, tasks with preferences; run geocoding (Mapbox), directions (Mapbox), scoring and ranking, return 3–5 options.
  - Use SpoonOS `LLMManager` for reasoning/structuring steps where helpful (e.g., preference interpretation), but core routing via Mapbox.
2. Node integration:
  - Update `RouteOptimizationService` to call Python `/optimize-route` when `USE_PY_AGENT=true` and transform response into existing `RouteOption` shape.
3. Config:
  - Ensure Python service reads `.env` (Sudo + Mapbox); Node only needs `PY_AGENT_URL` and mock toggle.
4. Verification:
  - Health checks: Node `/api/routes/health` shows configured; Python `/health` returns `sudo: configured`.
  - Post a sample input to Node `/api/routes/optimize-route`; confirm real geocoding/directions used and 3–5 ranked routes.

## Risks & Mitigations
- Two processes: Keep Node fallback path to TypeScript agents if Python is down.
- Latency: Batch calls and cache geocodes; minimal overhead for hackathon demo.

## Ready to Execute
I will implement the Python optimization endpoint, wire Node to it behind a flag, and verify end-to-end with your keys. No frontend changes required.