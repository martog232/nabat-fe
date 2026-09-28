import type { components } from './api'

// ─── Domain enums ────────────────────────────────────────────────────────────

type ApiAlert = components['schemas']['AlertResponse']

/**
 * Categories, statuses and closers come from the contract rather than being retyped here.
 * The first two used to be hand-written unions, and when the backend replaced them the only
 * sign in this repository was a map full of labels reading `undefined`. Derived, a change
 * on the server is a compile error at every place that has to handle it — which is the
 * point, since `Record<AlertType, …>` below then refuses to build until each gets a label.
 */
export type AlertType   = NonNullable<ApiAlert['type']>
export type AlertStatus = NonNullable<ApiAlert['status']>
export type ClosedBy    = NonNullable<ApiAlert['closedBy']>
export type VoteType      = 'UPVOTE' | 'DOWNVOTE' | 'CONFIRM'

// ─── Domain models (match backend AlertResponse / UserResponse) ──────────────

/**
 * The backend's own `UserResponse`, generated from `contracts/openapi.json`.
 *
 * <p>Not imported anywhere else. `User` below is what the application uses; this exists so
 * that the field names come from the server's contract rather than from memory.
 */
type ApiUser = components['schemas']['UserResponse']

/**
 * Signed-in user, derived from the server's schema rather than retyped from it.
 *
 * <p>Fields had gone missing from the hand-written version — `enabled` and
 * `emailVerified` among them — all of them returned by the server for months. Nothing failed:
 * the settings screen simply had no value to show and the admin screen could not have been
 * written. `Pick` is what makes that impossible now, because naming a field the contract does
 * not have is a compile error.
 *
 * <p>`Required` because springdoc marks nothing as required, so every generated field is
 * optional. That is a gap in the spec, not in the API — `/auth/me` always returns all of
 * these — and tightening it here beats making every caller check for undefined.
 */
export type User = Required<
  Pick<ApiUser, 'id' | 'email' | 'displayName' | 'role' | 'enabled' | 'emailVerified'>
> & {
  /** The district a DISTRICT_OFFICIAL acts for; null for every other role. */
  districtCode: string | null
}

/**
 * Also from the contract, so adding a role on the backend needs no edit here — and removing
 * one breaks whatever still refers to it.
 */
export type Role = NonNullable<ApiUser['role']>

/** What `GET /api/v1/admin/users` returns. `total` is how a caller knows there is another page. */
export interface AdminUserPage {
  users: User[]
  total: number
}

/**
 * Mirrors backend AlertResponse exactly.
 *
 * Carries the vote tallies *and* `credibilityScore`, so a list of alerts is enough to
 * render credibility without per-alert stats requests.
 */
export interface Alert {
  id: string                 // UUID
  title: string
  description: string
  type: AlertType
  latitude: number
  longitude: number
  createdAt: string          // ISO Instant
  status: AlertStatus
  reportedBy: string         // UUID
  upvoteCount: number
  downvoteCount: number
  confirmationCount: number
  credibilityScore: number   // computed by the voting service — never recomputed here
  resolvedAt: string | null  // ISO Instant, set only when RESOLVED
  photoUrl?: string          // URL of uploaded photo, if any
  /** The Sofia district the report is in — who it was sent to. Null only on old reports. */
  districtCode: string | null
  /** Who closed it; null while open. "The district says fixed" is not "the reporter says so". */
  closedBy: ClosedBy | null
}

/** One of Sofia's 24 districts, as `GET /api/v1/districts` lists them. */
export type District = Required<components['schemas']['DistrictResponse']>

export type ReportRanking = NonNullable<components['schemas']['RankedReportsResponse']['ranking']>

/** One page of the public list: `GET /api/v1/alerts/ranked`. */
export interface RankedReportsResponse {
  alerts: Alert[]
  ranking: ReportRanking
  page: number
  size: number
  total: number
}

/**
 * What `GET /api/v1/alerts/nearby` actually returns.
 *
 * It is an envelope, not a bare array — the endpoint is capped server-side, and a cap the
 * client cannot see is worse than no cap, because a map silently goes partial. `truncated`
 * says the cap was hit and the answer is incomplete; the fix is a smaller radius or a
 * filter, not a next page, because there is no pagination here by design.
 */
export interface NearbyAlertsResponse {
  alerts: Alert[]
  count: number
  /** The cap the server applied, so the client can say how much it is missing. */
  limit: number
  truncated: boolean
}

export interface VoteStats {
  upvotes: number
  downvotes: number
  confirmations: number
  credibilityScore: number
}

// ─── API request/response types ──────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string              // valid email, required
  password: string           // min 6 chars
  displayName: string        // 2–50 chars
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number          // seconds
  user: User
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface WebSocketTicketResponse {
  ticket: string
  expiresAt: string // ISO Instant
}

export interface CreateAlertRequest {
  title: string              // 1–200
  description: string        // 1–2000
  type: AlertType
  latitude: number           // -90..90
  longitude: number          // -180..180
  photoUrl?: string          // URL from upload endpoint, if any
}

export interface VoteRequest {
  voteType: VoteType
}

/** Response from POST /alerts/{id}/votes — the recorded vote plus the resulting tallies. */
export interface VoteReceipt {
  id: string
  alertId: string
  voteType: VoteType
  createdAt: string
  stats: VoteStats
}

/** Mirrors backend UserVoteResponse from GET /alerts/{id}/votes/me */
export interface MyVoteResponse {
  hasVoted: boolean
  voteType: VoteType | null
}

/** Combined vote stats + current user's vote — fetched as a single query so both update in sync */
export interface VoteDetails {
  stats: VoteStats
  myVote: MyVoteResponse
}

// Backend error envelopes (from GlobalExceptionHandler)

/**
 * Stable failure identifiers. Branch on `code`, never on `message` — the backend
 * deliberately returns curated prose that may be reworded, and previously replaced
 * every service message with a generic string, which is why digging through
 * `data.message` never yielded anything useful.
 */
export type ErrorCode =
  | 'BAD_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'CONCURRENT_UPDATE'
  | 'OUTSIDE_SERVICE_AREA'
  | 'VOTE_ALREADY_CAST'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export interface ErrorResponse {
  status: number
  code: ErrorCode
  message: string
  timestamp: string
  traceId: string | null
}

export interface ValidationErrorResponse {
  status: number
  code: 'VALIDATION_FAILED'
  message: string
  errors: Record<string, string>
  timestamp: string
  traceId: string | null
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'ALERT_UPVOTED'
  | 'ALERT_DOWNVOTED'
  | 'ALERT_CONFIRMED'
  | 'ALERT_MILESTONE'
  | 'ALERT_RESOLVED'

export interface Notification {
  id: string
  recipientId: string
  type: NotificationType
  title: string
  message: string | null
  relatedAlertId: string | null
  triggeredByUserId: string | null
  read: boolean
  createdAt: string
}

export interface UnreadCountResponse {
  count: number
}

// ─── WebSocket ───────────────────────────────────────────────────────────────

export interface WsNewAlertFrame {
  type: 'NEW_ALERT'
  alert: Alert
}

export interface WsAlertUpdatedFrame {
  type: 'ALERT_UPDATED'
  alert: Alert
}

export interface WsNotificationFrame {
  type: 'NOTIFICATION'
  notification: Notification
}

export type WsFrame = WsNewAlertFrame | WsAlertUpdatedFrame | WsNotificationFrame

// ─── UI helpers (unchanged) ──────────────────────────────────────────────────

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  POTHOLE: 'Pothole',
  MANHOLE: 'Manhole',
  WASTE: 'Waste',
  POLLUTION: 'Pollution',
  STREET_LIGHT: 'Street light',
  ILLEGAL_PARKING: 'Illegal parking',
  OTHER: 'Other',
}

export const ALERT_TYPE_ICONS: Record<AlertType, string> = {
  POTHOLE: '🕳️',
  MANHOLE: '⚠️',
  WASTE: '🗑️',
  POLLUTION: '🏭',
  STREET_LIGHT: '💡',
  ILLEGAL_PARKING: '🚗',
  OTHER: '📍',
}

/**
 * The states a report is still waiting in. Mirrors `AlertStatus.isOpen()` on the backend,
 * which is why it names the open states and derives the rest: RESOLVED and REJECTED are the
 * only two that are final, and everything else is on the map.
 */
export const OPEN_STATUSES: readonly AlertStatus[] = ['SUBMITTED', 'SENT', 'ACKNOWLEDGED', 'IN_PROGRESS']

export function isOpen(status: AlertStatus): boolean {
  return OPEN_STATUSES.includes(status)
}

/** Where a report is, in the words of the person waiting on it. */
export const STATUS_LABELS: Record<AlertStatus, string> = {
  SUBMITTED: 'Submitted',
  SENT: 'Sent to district',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
}

export const STATUS_COLORS: Record<AlertStatus, string> = {
  SUBMITTED:    'text-slate-300 bg-slate-400/10 border-slate-400/30',
  SENT:         'text-sky-400 bg-sky-400/10 border-sky-400/30',
  ACKNOWLEDGED: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  IN_PROGRESS:  'text-amber-400 bg-amber-400/10 border-amber-400/30',
  RESOLVED:     'text-green-400 bg-green-400/10 border-green-400/30',
  REJECTED:     'text-rose-400 bg-rose-400/10 border-rose-400/30',
}

/**
 * Marker colour by status, which replaced colour by severity when severity went. The
 * useful question on a map of the city is no longer "how bad" but "has anyone picked this
 * up": grey until it reaches the district, then warmer as work gets closer.
 */
export const STATUS_MARKER_COLORS: Record<AlertStatus, string> = {
  SUBMITTED:    '#94a3b8',
  SENT:         '#38bdf8',
  ACKNOWLEDGED: '#a78bfa',
  IN_PROGRESS:  '#f59e0b',
  RESOLVED:     '#22c55e',
  REJECTED:     '#f43f5e',
}

/** Who closed a report, said so a reader knows how much weight to give it. */
export const CLOSED_BY_LABELS: Record<ClosedBy, string> = {
  DISTRICT: 'by the district',
  REPORTER: 'by the reporter',
  MODERATOR: 'by a moderator',
}

export const RANKING_LABELS: Record<ReportRanking, string> = {
  HOT: 'Most supported now',
  LONGEST_WAITING: 'Waiting longest',
  NEWEST: 'Newest',
}
