// ─── Domain enums ────────────────────────────────────────────────────────────

export type AlertType =
    | 'CRIME'
    | 'FIRE'
    | 'ACCIDENT'
    | 'MEDICAL_EMERGENCY'
    | 'NATURAL_DISASTER'
    | 'SUSPICIOUS_ACTIVITY'
    | 'TRAFFIC'
    | 'HAZARD'
    | 'MISSING_PERSON'
    | 'OTHER'

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type AlertStatus   = 'ACTIVE' | 'RESOLVED'
export type VoteType      = 'UPVOTE' | 'DOWNVOTE' | 'CONFIRM'
export type Role          = 'USER' | 'ADMIN'

// ─── Domain models (match backend AlertResponse / UserResponse) ──────────────

export interface User {
  id: string                 // UUID
  email: string
  displayName: string
  role: Role
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
  severity: AlertSeverity
  latitude: number
  longitude: number
  createdAt: string          // ISO Instant
  status: AlertStatus
  reportedBy: string         // UUID
  upvoteCount: number
  downvoteCount: number
  confirmationCount: number
  credibilityScore: number   // computed by the voting service — never recomputed here
  resolvedAt: string | null  // ISO Instant or null while ACTIVE
  photoUrl?: string          // URL of uploaded photo, if any
}

export interface UserPreferencesResponse {
  notificationRadiusKm: number
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
  severity: AlertSeverity
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
  CRIME: 'Crime',
  FIRE: 'Fire',
  ACCIDENT: 'Accident',
  MEDICAL_EMERGENCY: 'Medical Emergency',
  NATURAL_DISASTER: 'Natural Disaster',
  SUSPICIOUS_ACTIVITY: 'Suspicious Activity',
  TRAFFIC: 'Traffic',
  HAZARD: 'Hazard',
  MISSING_PERSON: 'Missing Person',
  OTHER: 'Other',
}

export const ALERT_TYPE_ICONS: Record<AlertType, string> = {
  CRIME: '🔫',
  FIRE: '🔥',
  ACCIDENT: '💥',
  MEDICAL_EMERGENCY: '🚑',
  NATURAL_DISASTER: '🌪️',
  SUSPICIOUS_ACTIVITY: '👁️',
  TRAFFIC: '🚗',
  HAZARD: '⚠️',
  MISSING_PERSON: '🔍',
  OTHER: '📍',
}

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  LOW:      'text-green-400 bg-green-400/10 border-green-400/30',
  MEDIUM:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  HIGH:     'text-orange-400 bg-orange-400/10 border-orange-400/30',
  CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export const SEVERITY_MARKER_COLORS: Record<AlertSeverity, string> = {
  LOW:      '#22c55e',
  MEDIUM:   '#f59e0b',
  HIGH:     '#f97316',
  CRITICAL: '#ef4444',
}