# AGENTS.md — Nabat frontend

React 18 + TypeScript + Vite SPA. Real-time safety-alert map client for the Nabat platform. Read `README.md` for product context; this file is the agent-facing cheat sheet.

---

## Tech stack

| Concern | Library |
|---------|---------|
| UI framework | React 18 |
| Language | TypeScript (strict) |
| Build | Vite |
| State management | Zustand (`src/store/`) — UI-only state (selectedAlertId, map, user location) |
| Server state | React Query (`src/hooks/`) — all API data (alerts, votes, notifications) |
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
    user.ts      # userApi (update preferences: radius + last known location)
    votes.ts     # votesApi
    notifications.ts  # notificationsApi
    uploads.ts   # uploadsApi (POST multipart file, return URL)
  components/
    alerts/      # AlertCard, AlertDetail, AlertSidebar, CreateAlertModal
    auth/        # login / register forms
    common/      # shared UI primitives (Toast, Spinner, Button, Input, LocationPicker)
    layout/      # shell, nav (Navbar with notification bell + badge)
    map/         # Leaflet map wrapper + alert markers
                 # includes RadiusSelector and user follow-mode controls
    notifications/  # NotificationPanel dropdown
  hooks/
    useAlerts.ts           # React Query: useNearbyAlerts (no polling), useCreateAlert, useResolveAlert
    useAlertWebSocket.ts   # WS: single source of truth for alerts after initial load
    useWebSocket.ts        # Generic WS primitive (ref-based stable callbacks, reconnect)
    useNotifications.ts    # React Query: notifications list, unread count, mark read
    useGeolocation.ts      # GPS watch + store updates + throttled preference sync
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    MapPage.tsx
  store/
    alertStore.ts   # Zustand — UI-only: selectedAlertId, mapCenter, mapZoom, radiusKm, user location, wsConnected
    authStore.ts    # Zustand — current user, tokens, login/logout actions
    themeStore.ts   # Zustand — dark/light mode
    toastStore.ts   # Zustand — toast notifications queue
  types/
    index.ts        # All shared TypeScript types (mirrors backend DTOs exactly)
  utils/
    geo.ts          # shared Haversine distance helper (metres)
```

---

## Implemented features (current state)

### State management boundary
- **React Query owns all server state**: alerts, votes, notifications.
- **Zustand owns only UI state**: `selectedAlertId`, `mapCenter`, `mapZoom`, `radiusKm`, user GPS location, `followUser`, `wsConnected`.
- No server data duplication between stores and React Query.

### Authentication (`store/authStore.ts`, `api/auth.ts`)
- `authStore` persists `accessToken`, `refreshToken`, and `user` to `localStorage`.
- Axios request interceptor attaches `Authorization: Bearer <accessToken>` on every API call.
- Axios response interceptor catches `401`, calls `POST /api/v1/auth/refresh`, retries the original request once, then logs the user out on a second failure.

### WebSocket — single source of truth (`hooks/useAlertWebSocket.ts`)
The hook is the single owner of the WebSocket lifecycle and the sole data source for real-time changes:

1. **Ticket-based auth** — calls `POST /api/v1/ws/tickets` before opening the socket, connects to `ws://.../ws/alerts?ticket=<ticket>`.
2. **Frame handling**:
   - `NEW_ALERT` — buffered (400ms flush) and merged into React Query alerts cache via `setQueryData`. Proximity toasts shown for alerts within radius.
   - `ALERT_UPDATED` — merged directly (no buffer) into React Query cache. Sent by backend after vote or resolve.
   - `NOTIFICATION` — invalidates notifications query, shows toast with notification title.
3. **Exponential backoff reconnect** — `3 s × 2^(attempt−1)`, capped at 30 s.
4. **State catch-up on reconnect** — records `disconnectedAt` when socket closes; on next open calls `alertsApi.getSince(...)` to backfill missed alerts.
5. **No REST polling** — after initial `useNearbyAlerts()` load, all updates come through the WS.

### Alert store (`store/alertStore.ts`)
- UI-only state: `selectedAlertId`, `mapCenter`, `mapZoom`, `radiusKm`, `userLat`, `userLng`, `locationAccuracy`, `followUser`, `wsConnected`.
- No `alerts[]` or `setAlerts`/`addAlert`/`upsertAlerts` — those lived here briefly during an earlier refactoring but were removed when React Query took over server state.

### Geolocation + preferences sync (`hooks/useGeolocation.ts`, `api/user.ts`, `utils/geo.ts`)
- `useGeolocation` starts `navigator.geolocation.watchPosition(...)` while `MapPage` is mounted.
- Each GPS fix updates `alertStore.setUserLocation(lat, lng, accuracy)`.
- When `followUser` is true, each fix also updates `mapCenter`.
- Preferences sync is fire-and-forget via `PATCH /api/v1/users/me/preferences`, throttled to only sync when moved >200 m or when >5 minutes elapsed since last sync.
- Distance calculations use shared `haversineDistanceM(...)` from `src/utils/geo.ts`.

### Radius selector + map overlays (`components/map/RadiusSelector.tsx`, `components/map/AlertMap.tsx`)
- Radius presets: `1 / 5 / 10 / 25 / 50 km`.
- Selector applies optimistic `setRadiusKm(...)` immediately, then debounces server sync (800 ms).
- `AlertMap` renders user marker (custom blue pulsing dot), user radius circle, follow-mode toggle.
- Manual map drag disables follow mode.

### Alert queries & mutations (`hooks/useAlerts.ts`)
- `useNearbyAlerts()` — single initial fetch on mount (no `refetchInterval`). WS handles subsequent updates.
- `useCreateAlert()` — mutation, invalidates alerts cache on success.
- `useResolveAlert(alertId)` — mutation with optimistic update + rollback on error.

### Notification system (`hooks/useNotifications.ts`, `components/notifications/NotificationPanel.tsx`)
- `useNotifications()` — fetches all notifications.
- `useUnreadCount()` — polls every 30s for badge count (fallback beyond WS push).
- `useMarkAsRead()` / `useMarkAllAsRead()` — optimistic updates with rollback.
- Navbar bell icon displays unread count badge.
- `NotificationPanel` dropdown shows type icons (👍/👎/✅/🏆/🔒), timestamps, click-to-select-alert.

### Photo upload (two-step)
- `CreateAlertModal.tsx` — "Choose photo" button + image preview + size/type validation.
  The accepted types (`ACCEPTED_IMAGE_TYPES`) must mirror the server's `ImageContentType`
  allow-list; SVG is excluded on both sides because it can carry script.
- `uploadsApi.upload(File)` → `POST /api/v1/uploads` → returns `{ url }`.
  It passes `Content-Type: undefined` so axios can set `multipart/form-data` with a
  boundary — `apiClient`'s global `application/json` default otherwise wins and the
  request body is unparseable.
- URL is passed to `alertsApi.create({ ...form, photoUrl })` in a second JSON step. The
  uploaded URL is held in a ref so a retry after a failed create reuses it instead of
  uploading a second copy (the first would be orphaned server-side either way).
- `Alert.photoUrl?: string` displayed in `AlertDetail`/`AlertCard` when present.

### Alert API (`api/alerts.ts`)
| Method | Backend endpoint | Description |
|--------|-----------------|-------------|
| `getNearby(lat, lng, radiusKm)` | `GET /api/v1/alerts/nearby` | Initial load |
| `getSince(lat, lng, radiusKm, since)` | `GET /api/v1/alerts/nearby?since=<ISO>` | WS reconnect catch-up |
| `create(data)` | `POST /api/v1/alerts` | Report new alert (JSON, optional `photoUrl`) |

`CreateAlertRequest` must **not** include a `reportedBy` field — the backend derives it from the JWT.

### Types (`types/index.ts`)
All types mirror backend DTOs exactly. Key contracts:

- `Alert` — includes `upvoteCount`, `downvoteCount`, `confirmationCount`,
  `credibilityScore` and `photoUrl?`. Because the score is on every alert, components
  showing only totals should read them off the `Alert` rather than calling
  `useVoteData`, which costs two extra requests per card.
- `CreateAlertRequest` — includes optional `photoUrl`.
- `VoteReceipt` — the `POST .../votes` response, carrying the resulting `stats`. Use
  these rather than re-fetching `/votes/stats`, which is eventually consistent.
- `WsFrame` union: `WsNewAlertFrame | WsAlertUpdatedFrame | WsNotificationFrame`.
- `Notification` — matches `NotificationResponse`, the same shape the WebSocket sends.
- `ErrorResponse.code` (`ErrorCode`) — **branch on this, never on `message`.** The
  backend returns curated prose that may be reworded.

**Never recompute `credibilityScore` on the client.** The voting service owns the
formula; there were previously four independent copies of it across the two backends
and this app.

---

## Conventions

- **One Zustand store per concern.** Do not add unrelated state to an existing store.
- **API calls live in `src/api/`**, never inline in components or hooks. Each file wraps one backend resource.
- **Hooks own side-effects** (WS, timers). Components read from stores and call API functions; they do not manage sockets directly.
- **Types first.** When the backend contract changes, update `types/index.ts` first, then fix compile errors downstream.
- **Error handling**: API errors from `GlobalExceptionHandler` arrive as `ErrorResponse` or `ValidationErrorResponse`. Surface them via `toastStore.addToast(...)`, not `console.error` or `alert`.
- `buildWebSocketUrl(path, params)` in `api/client.ts` constructs the full WS URL from `VITE_API_BASE_URL`. Use it everywhere — never hardcode WebSocket URLs.

### Responsive layout

This is a safety app; the screen it is opened on during an incident is a phone. Mobile is the base layout and desktop is the breakpoint override, not the other way round.

- **Layout differences are Tailwind breakpoints; behaviour differences are `useMediaQuery`.** Which edge a panel slides from is CSS and needs no JavaScript. Whether the alert list *starts* open, and that selecting an alert collapses it on a phone, cannot be expressed in CSS — those go through `useIsDesktop()` (`hooks/useMediaQuery.ts`) and are covered by `AlertSidebar.test.tsx`. Do not add a resize listener; do not branch layout in JS that a class can do.
- **`xs: 400px` exists because `sm` is 640px**, which is wider than any phone in portrait. The 360–400px range is the most common screen this app will ever see.
- **Heights are `dvh`, never `vh` or `100%` of the window.** On a phone the browser chrome counts toward `100vh`, so anything bottom-anchored hides under the URL bar. `html, body, #root` are `100dvh` behind an `@supports`.
- **`--sheet-peek` is the contract between the bottom sheet and everything above it.** The collapsed alert sheet reserves that much space; the report button, the map's zoom and follow controls and the detail sheet all offset by `calc(var(--sheet-peek) + …)`. It is `0rem` from `md` up, so the same classes work on desktop. Anything new anchored to the bottom of the map uses it too, or it will end up under the sheet.
- **Two sheets never share the screen.** The detail sheet and the list sheet occupy the same place on a phone, which is why opening an alert closes the list.
- **Touch targets are ≥44px at base, shrinking at `sm`/`md`** (`w-11 h-11 sm:w-8 sm:h-8`, `min-h-[2.75rem]`). A 32px control is comfortable with a mouse and a miss with a thumb.
- **Bottom-anchored and top-anchored chrome pads for `env(safe-area-inset-*)`.** It resolves to zero everywhere without a notch or home indicator, so it costs nothing to be correct.
- **Panels that can outgrow the screen are `flex flex-col` with a `flex-1 min-h-0 overflow-y-auto overscroll-contain` body**, so the header and the action buttons stay put while the content scrolls. `overscroll-contain` matters here: without it a flick at the end of a list drags the map underneath.
- **Form controls are 16px on phones** (`index.css`). iOS zooms the page when a focused input is smaller and does not zoom back out.
- **Both toggles are always in the DOM**, hidden by CSS. jsdom loads no stylesheet, so tests must query by accessible name — `getByRole('button', { expanded: false })` matches both and throws.

---

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Base URL. Defaults straight to nabat-app; point it at Kong (:8000) for prod parity | `http://127.0.0.1:8080/api/v1` |

Use `127.0.0.1`, not `localhost` (Windows IPv6 quirk — backend also uses `127.0.0.1`).

---

## Development

```bash
npm install
npm run dev          # Vite dev server on :5173, proxies /api → nabat-app (127.0.0.1:8080)
npm run build        # production build to dist/
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm run test         # vitest (23 tests across 6 files)
npm run test:watch   # vitest in watch mode
```

---

## Known gaps / next tasks

| Area | Status | Notes |
|------|--------|-------|
| Optimistic vote UI | ✅ Done | `useAlerts.ts` implements optimistic updates with rollback |
| Resolve alert UI | ✅ Done | `AlertDetail.tsx` has resolve button (reporter + admin only) |
| Notification panel | ✅ Done | Navbar bell + dropdown with type icons, timestamps, mark read |
| Photo upload UI | ✅ Done | File picker, preview, validation in `CreateAlertModal` |
| Admin role enforcement | ❌ Missing | `Role.ADMIN` exists; no UI gates any action behind it |
| Photo display in AlertCard/AlertDetail | ❌ Missing | `photoUrl` field exists on `Alert` type but no UI renders it yet |
| Mobile layout | ✅ Done | Mobile-first throughout: alert list is a bottom sheet under `md`, create form is a full-height sheet, controls clear `--sheet-peek`, `dvh` heights, safe-area padding, 44px touch targets. See "Responsive layout" under Conventions. |
| Verified on a real device | ❌ Not done | The responsive work was checked by reading the generated CSS, the type-checker and the test suite — no browser and no phone. Nothing here has been *looked at* on hardware. |
