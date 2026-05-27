# AGENTS.md — Nabat frontend

React 18 + TypeScript + Vite SPA. Real-time safety-alert map client for the Nabat platform. Read `README.md` for product context; this file is the agent-facing cheat sheet.

---

## Tech stack

| Concern | Library |
|---------|---------|
| UI framework | React 18 |
| Language | TypeScript (strict) |
| Build | Vite |
| State management | Zustand (`src/store/`) |
| HTTP client | Axios (`src/api/client.ts`) |
| Map | Leaflet (via `react-leaflet`) |
| Styling | Tailwind CSS |

---

## Project structure

```
src/
  api/           # Axios wrappers — one file per backend resource
    client.ts    # apiClient (Axios instance) + buildWebSocketUrl()
    alerts.ts    # alertsApi  (getNearby, getSince, create)
    auth.ts      # authApi
    votes.ts     # votesApi
  components/
    alerts/      # AlertCard, AlertDetail, AlertSidebar, CreateAlertModal
    auth/        # login / register forms
    common/      # shared UI primitives (Toast, Spinner, …)
    layout/      # shell, nav
    map/         # Leaflet map wrapper + alert markers
  hooks/
    useAlerts.ts           # periodic REST polling for nearby alerts
    useAlertWebSocket.ts   # real-time WS connection + reconnect + catch-up
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    MapPage.tsx
  store/
    alertStore.ts   # Zustand — alerts list, map state, WS connection flag
    authStore.ts    # Zustand — current user, tokens, login/logout actions
    themeStore.ts   # Zustand — dark/light mode
    toastStore.ts   # Zustand — toast notifications queue
  types/
    index.ts        # All shared TypeScript types (mirrors backend DTOs exactly)
```

---

## Implemented features (current state)

### Authentication (`store/authStore.ts`, `api/auth.ts`)
- `authStore` persists `accessToken`, `refreshToken`, and `user` to `localStorage`.
- Axios request interceptor attaches `Authorization: Bearer <accessToken>` on every API call.
- Axios response interceptor catches `401`, calls `POST /api/v1/auth/refresh`, retries the original request once, then logs the user out on a second failure.
- Tokens are stored under `accessToken` / `refreshToken` keys in `localStorage`.

### WebSocket connection (`hooks/useAlertWebSocket.ts`)
The hook is the single owner of the WebSocket lifecycle. Key behaviours:

1. **Ticket-based auth** — calls `POST /api/v1/ws/tickets` (via `authApi.getWsTicket()`) before opening the socket, then connects to `ws://.../ws/alerts?ticket=<ticket>`. **Never pass `?userId=` or a raw JWT in the URL.**
2. **Message buffering** — incoming `NEW_ALERT` frames are staged in `pendingAlerts` ref and flushed into Zustand in batches every `WS_FLUSH_INTERVAL_MS` (400 ms) to prevent render thrashing.
3. **Exponential backoff reconnect** — on close, waits `3 s × 2^(attempt−1)`, capped at 30 s.
4. **State catch-up on reconnect** — records `disconnectedAt` (ISO timestamp) when the socket closes; on the next successful open calls `alertsApi.getSince(lat, lng, radiusKm, since)` to backfill any missed alerts, then clears `disconnectedAt`.
5. **Cleanup** — flushes any pending alerts and closes the socket on unmount.

> ⚠️ The `useAlertWebSocket` hook currently passes `?token=<accessToken>` from `localStorage` in `buildWebSocketUrl`. This must be migrated to the ticket flow (`POST /api/v1/ws/tickets`) — see Known Gaps.

### Alert store (`store/alertStore.ts`)
- `alerts: Alert[]` — master list, newest first.
- `upsertAlerts(alerts)` — merges by `id`: updates existing records in-place, prepends new ones. Used by both the WS flush and the catch-up REST call.
- `addAlert(alert)` — prepends only if not already present (used for single inserts).
- `mapCenter`, `mapZoom`, `radiusKm` — controlled by the map component; `useAlertWebSocket` reads `mapCenter` and `radiusKm` for catch-up queries.
- `wsConnected` — flag surfaced to the UI for a connection indicator.

### Periodic REST polling (`hooks/useAlerts.ts`)
- Polls `GET /api/v1/alerts/nearby` every 30 s using `mapCenter` and `radiusKm` from the store.
- Uses `setAlerts` (full replace) on the first load; uses `upsertAlerts` on subsequent polls so real-time WS inserts are not overwritten.

### Alert API (`api/alerts.ts`)
| Method | Backend endpoint | Description |
|--------|-----------------|-------------|
| `getNearby(lat, lng, radiusKm)` | `GET /api/v1/alerts/nearby` | Initial load |
| `getSince(lat, lng, radiusKm, since)` | `GET /api/v1/alerts/nearby?since=<ISO>` | WS reconnect catch-up |
| `create(data)` | `POST /api/v1/alerts` | Report new alert |

`CreateAlertRequest` must **not** include a `reportedBy` field — the backend derives it from the JWT.

### Types (`types/index.ts`)
All types mirror backend DTOs exactly. Key contracts:

- `Alert` — includes `upvoteCount`, `downvoteCount`, `confirmationCount` (returned on every alert response after the credibility projection was added). A computed `credibilityScore` is **not** returned by the backend; calculate it in the UI as `upvotes - downvotes + (confirmations × 2)` when needed.
- `WsFrame` — currently only `WsNewAlertFrame { type: 'NEW_ALERT'; alert: Alert }`. New frame types must be added here and handled in `useAlertWebSocket.ts`.
- `VoteRequest { voteType: VoteType }` — payload for `POST /api/v1/alerts/{id}/votes`.

---

## Conventions

- **One Zustand store per concern.** Do not add unrelated state to an existing store.
- **API calls live in `src/api/`**, never inline in components or hooks. Each file wraps one backend resource.
- **Hooks own side-effects** (WS, polling). Components read from the store and call API functions; they do not manage timers or sockets directly.
- **Types first.** When the backend contract changes, update `types/index.ts` first, then fix compile errors downstream.
- **Error handling**: API errors from `GlobalExceptionHandler` arrive as `ErrorResponse` or `ValidationErrorResponse`. Surface them via `toastStore.addToast(...)`, not `console.error` or `alert`.
- `buildWebSocketUrl(path, params)` in `api/client.ts` constructs the full WS URL from `VITE_API_BASE_URL`. Use it everywhere — never hardcode WebSocket URLs.

---

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Base URL of the Nabat backend (no trailing slash) | `http://127.0.0.1:8080/api/v1` |

Use `127.0.0.1`, not `localhost` (Windows IPv6 quirk — backend also uses `127.0.0.1`).

---

## Development

```bash
npm install
npm run dev        # Vite dev server on :5173, proxies /api → backend
npm run build      # production build to dist/
npm run lint       # ESLint
npm run type-check # tsc --noEmit
```

---

## Known gaps / next tasks

| Area | Status | Notes |
|------|--------|-------|
| WS ticket flow | ❌ Bug | `useAlertWebSocket` passes `?token=<JWT>` instead of a short-lived ticket. Needs `authApi.getWsTicket()` → `POST /api/v1/ws/tickets`, then pass `?ticket=<ticket>` |
| Optimistic vote UI | ❌ Missing | `AlertDetail` vote buttons call API and wait. Implement: update store immediately, roll back with toast on error |
| Resolve alert UI | ❌ Missing | Backend has `Alert.resolve()` but no endpoint. Once backend exposes `PATCH /api/v1/alerts/{id}/resolve`, add button in `AlertDetail` (reporter + admin only) |
| Admin role enforcement | ❌ Missing | `Role.ADMIN` exists; no UI gates any action behind it |
| Notification panel | ❌ Missing | Backend `NotificationService` + WS push is implemented. FE needs to handle `NOTIFICATION` WS frame type and display an inbox |
| `GetNotificationUseCase` | ❌ Missing | Backend endpoint not yet exposed; blocked |
| Test coverage | ❌ None | No tests exist. Start with Vitest unit tests for store actions and hook logic |
