import type { components } from './api'

// ─── Domain enums ────────────────────────────────────────────────────────────

type ApiAlert = components['schemas']['AlertResponse']

/**
 * Statuses and closers come from the contract rather than being retyped here. Statuses used
 * to be a hand-written union, and when the backend replaced them the only sign in this
 * repository was a map full of labels reading `undefined`. Derived, a change on the server
 * is a compile error at every place that has to handle it.
 *
 * Categories are not an enum any more: they are Call Sofia's catalogue, served by
 * `GET /api/v1/categories`, and a report carries the code of one subcategory.
 */
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
  /** The authority an OFFICIAL acts for — a district or an institution; null for every other role. */
  authorityCode: string | null
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
  /** Call Sofia's code of a subcategory — never a group. Resolve it with `useCategoryIndex`. */
  categoryCode: number
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
  /** The Sofia district the report is in. Null only on old reports. */
  districtCode: string | null
  /**
   * Who answers for it and was sent it: the district, or the city-wide institution its
   * category belongs to. Name it with `useAuthorityNames`.
   */
  authorityCode: string | null
  /**
   * When its authority has to have answered by; null when nothing is waiting on it (not yet
   * delivered, answered, or closed). Past it, the report is overdue — see `overdueDays`.
   */
  answerDueAt: string | null
  /** Who closed it; null while open. "The authority says fixed" is not "the reporter says so". */
  closedBy: ClosedBy | null
  /** Whether people say a resolved report is really fixed. Always present; UNCHECKED until someone answers. */
  fixCheck: FixCheckSummary
}

/** One person's answer to "is it really fixed?". */
export type FixVerdict = 'FIXED' | 'PARTLY' | 'NOT_FIXED'

/**
 * What the answers add up to — computed by the server, never here. DISPUTED when the reporter
 * says not fixed, or more say not than say fixed; CONFIRMED when every answer is "fixed".
 */
export type FixOutcome = 'UNCHECKED' | 'CONFIRMED' | 'DISPUTED' | 'MIXED'

export interface FixCheckSummary {
  fixed: number
  partly: number
  notFixed: number
  /** The reporter's own answer, which weighs most; null if they have not given one. */
  reporterVerdict: FixVerdict | null
  outcome: FixOutcome
}

export interface FixCheckResponse {
  summary: FixCheckSummary
  /** The caller's own answer; null if they have not given one. */
  mine: FixVerdict | null
}

/** A report nobody has checked — what a report carries until someone answers. */
export const UNCHECKED_FIX: FixCheckSummary = {
  fixed: 0,
  partly: 0,
  notFixed: 0,
  reporterVerdict: null,
  outcome: 'UNCHECKED',
}

/** A subcategory a report can be filed under, with examples a citizen would recognise. */
export interface Category {
  code: number
  name: string
  hint: string | null
}

/**
 * One of the twelve groups of `GET /api/v1/categories`, in display order. The codes,
 * names and colours are Call Sofia's, so its data and ours can be compared directly.
 */
export interface CategoryGroup {
  code: number
  name: string
  color: string
  categories: Category[]
}

/**
 * One of Sofia's 24 districts, as `GET /api/v1/districts` lists them.
 *
 * `population` (an estimate, for per-resident ratios) stays optional: a district without one
 * must still render, and only the comparison page reads it.
 */
export type District = Omit<Required<components['schemas']['DistrictResponse']>, 'population'> & {
  population?: number
}

/**
 * Someone a report goes to, as `GET /api/v1/authorities` lists them: a district
 * administration, or a city-wide institution that takes some categories wherever they are.
 */
export type Authority = Required<components['schemas']['AuthorityResponse']>

/** One forward of a report, as `GET /api/v1/alerts/{id}/forwards` lists them, oldest first. */
export type ReportForward = Required<components['schemas']['ForwardResponse']>

/** One step of a report's life, as `GET /api/v1/alerts/{id}/history` lists them, oldest first. */
export interface ReportStep {
  step: 'CREATED' | 'SENT' | 'ACKNOWLEDGED' | 'WORK_STARTED' | 'RESOLVED' | 'REJECTED' | 'FORWARDED' | 'REOPENED' | 'WITHDRAWN'
  /** Null for what nabat does itself: delivering it. */
  actorName: string | null
  byAuthority: boolean
  authorityCode: string | null
  happenedAt: string
}

export type RejectionDecision = NonNullable<components['schemas']['RejectionResponse']['decision']>

/**
 * One rejection of a report, as `GET /api/v1/alerts/{id}/rejections` lists them: why, the
 * reporter's dispute if they made one, and a moderator's decision on it.
 */
export interface Rejection {
  reason: string
  byModerator: boolean
  authorityCode: string
  rejectedAt: string
  disputeReason: string | null
  disputedAt: string | null
  decision: RejectionDecision | null
  decidedAt: string | null
}

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

/** An open nabat report near the point asked about. */
export interface SimilarReport {
  report: Alert
  /** Metres from the point, rounded. */
  meters: number
}

/** A report open in Call Sofia near the point. Its category codes are the same as ours. */
export interface SimilarCallSofiaReport {
  id: number
  registryNumber: string | null
  title: string
  categoryCode: number
  submittedAt: string
  meters: number
  /** Its page on call.sofia.bg. */
  url: string
}

/**
 * "Is this already reported?" — open reports near a point in the same category group, in
 * nabat and in Call Sofia, nearest first. Advice only: nothing refuses a report over it.
 */
export interface SimilarReportsResponse {
  radiusMeters: number
  reports: SimilarReport[]
  /** Empty when the server is not reading Call Sofia's map. */
  callSofia: SimilarCallSofiaReport[]
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
  categoryCode: number       // a subcategory; a group code is refused with 400
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
  | 'COMMENTS_LOCKED'
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
  | 'COMMENT_ADDED'
  | 'REPORT_FORWARDED'
  | 'REPORT_PROGRESSED'

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

/**
 * The states a report is still waiting in. Mirrors `AlertStatus.isOpen()` on the backend,
 * which is why it names the open states and derives the rest: RESOLVED, REJECTED and WITHDRAWN are
 * the final ones, and everything else is on the map.
 */
export const OPEN_STATUSES: readonly AlertStatus[] = ['SUBMITTED', 'SENT', 'ACKNOWLEDGED', 'IN_PROGRESS']

export function isOpen(status: AlertStatus): boolean {
  return OPEN_STATUSES.includes(status)
}

/** Where a report is, in the words of the person waiting on it. */
export const STATUS_LABELS: Record<AlertStatus, string> = {
  SUBMITTED: 'Подаден',
  SENT: 'Изпратен до отговорните',
  ACKNOWLEDGED: 'Приет',
  IN_PROGRESS: 'В процес',
  RESOLVED: 'Решен',
  REJECTED: 'Отхвърлен',
  WITHDRAWN: 'Оттеглен',
}

export const STATUS_COLORS: Record<AlertStatus, string> = {
  SUBMITTED:    'text-slate-300 bg-slate-400/10 border-slate-400/30',
  SENT:         'text-sky-400 bg-sky-400/10 border-sky-400/30',
  ACKNOWLEDGED: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  IN_PROGRESS:  'text-amber-400 bg-amber-400/10 border-amber-400/30',
  RESOLVED:     'text-green-400 bg-green-400/10 border-green-400/30',
  REJECTED:     'text-rose-400 bg-rose-400/10 border-rose-400/30',
  WITHDRAWN:    'text-slate-400 bg-slate-400/10 border-slate-400/30',
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
  WITHDRAWN:    '#64748b',
}

/** Who closed a report, said so a reader knows how much weight to give it. */
export const CLOSED_BY_LABELS: Record<ClosedBy, string> = {
  AUTHORITY: 'от отговорната институция',
  REPORTER: 'от подателя',
  MODERATOR: 'от модератор',
}

export const FIX_VERDICT_LABELS: Record<FixVerdict, string> = {
  FIXED: 'Оправено е',
  PARTLY: 'Частично',
  NOT_FIXED: 'Не е оправено',
}

export const FIX_OUTCOME_LABELS: Record<FixOutcome, string> = {
  UNCHECKED: 'Непроверен',
  CONFIRMED: 'Потвърдено оправен',
  DISPUTED: 'Оспорен — не е оправен',
  MIXED: 'Разнопосочни мнения',
}

/** Disputed warns, confirmed reassures, mixed stays neutral. */
export const FIX_OUTCOME_COLORS: Record<FixOutcome, string> = {
  UNCHECKED: 'text-slate-500 bg-slate-400/10 border-slate-400/30',
  CONFIRMED: 'text-green-700 bg-green-500/10 border-green-500/30',
  DISPUTED: 'text-amber-700 bg-amber-500/10 border-amber-500/40',
  MIXED: 'text-slate-600 bg-slate-400/10 border-slate-400/30',
}

export const RANKING_LABELS: Record<ReportRanking, string> = {
  HOT: 'Най-подкрепяни сега',
  LONGEST_WAITING: 'Чакат най-дълго',
  NEWEST: 'Най-нови',
}

// ─── District comparison (Call Sofia archive) ────────────────────────────────

/**
 * How one district handled the Call Sofia reports filed in it over a period, as
 * `GET /api/v1/call-sofia/district-comparison` returns it. "Answered" is the first final
 * word to the citizen — a reply, a closure or a rejection — not a fix.
 */
export interface DistrictOutcomes {
  districtCode: string
  signals: number
  answered: number
  /** Over answered reports only; null if none were. */
  medianDaysToAnswer: number | null
  p90DaysToAnswer: number | null
  /** Reports filed at least 30 days before the archive ends — the only ones the deadline can judge. */
  dueIn30Days: number
  answeredIn30Days: number
  closed: number
  answeredOnly: number
  rejected: number
  stillOpen: number
}

export interface DistrictComparison {
  /** Null when no archive has been imported. */
  archiveFrom: string | null
  archiveTo: string | null
  from: string | null
  /** Exclusive. */
  to: string | null
  districts: DistrictOutcomes[]
}

/** A period to compare over; both absent means the archive's last twelve months. */
export interface ComparisonPeriod {
  from?: string
  to?: string
}

// ─── Comments ────────────────────────────────────────────────────────────────

export type CommentRemoval = NonNullable<components['schemas']['CommentResponse']['removedBy']>

/**
 * One comment in a report's thread, as `GET /api/v1/alerts/{id}/comments` returns it.
 * `byAuthority` (an official of the report's authority) and `byReporter` are the author's
 * standing when they wrote, not now.
 */
export interface Comment {
  id: string
  authorName: string
  byAuthority: boolean
  byReporter: boolean
  /** Written by the signed-in user. */
  mine: boolean
  /** Null once taken down; the comment keeps its place so replies still read as replies. */
  body: string | null
  createdAt: string
  removedBy: CommentRemoval | null
}

/** The server's limit; a longer comment is refused, not cut short. */
export const COMMENT_MAX_LENGTH = 2000
