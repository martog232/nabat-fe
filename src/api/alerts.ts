import type {
  Alert,
  AlertStatus,
  CreateAlertRequest,
  NearbyAlertsResponse,
  RankedReportsResponse,
  ReportForward,
  Rejection,
  RejectionDecision,
  ReportRanking,
  SimilarReportsResponse,
} from '../types'
import { apiClient } from './client'

export const alertsApi = {
  /**
   * Returns the envelope, not a bare array.
   *
   * This was typed `Alert[]` and read straight off `r.data` after the endpoint started
   * answering `{ alerts, count, limit, truncated }`, so every consumer received an object
   * where it expected a list and the map crashed on `alerts.filter`. Types were no help:
   * `Alert[]` was a claim about the wire, not a check of it.
   */
  getNearby: (lat: number, lng: number, radiusKm = 5, category: number | null = null) =>
    apiClient
      .get<NearbyAlertsResponse>('/alerts/nearby', {
        // `category` may be a group (matches all its subcategories) or a subcategory.
        params: { latitude: lat, longitude: lng, radiusKm, ...(category != null ? { category } : {}) },
      })
      .then((r) => r.data),

  /**
   * Alerts created at or after `since` (ISO 8601) within the given radius. Used to
   * catch up on what was missed while a WebSocket connection was down.
   *
   * The backend now actually implements this filter. It previously ignored the unknown
   * `since` parameter and returned the full nearby list, so the "missed events"
   * behaviour this function claims never existed.
   */
  getSince: (lat: number, lng: number, radiusKm: number, since: string) =>
    apiClient
      .get<NearbyAlertsResponse>('/alerts/nearby', { params: { latitude: lat, longitude: lng, radiusKm, since } })
      .then((r) => r.data.alerts),

  /**
   * Open reports within 100 m in the same category group as `categoryCode` (a subcategory),
   * in nabat and in Call Sofia — asked by the report form before filing.
   */
  similar: (lat: number, lng: number, categoryCode: number) =>
    apiClient
      .get<SimilarReportsResponse>('/alerts/similar', {
        params: { latitude: lat, longitude: lng, category: categoryCode },
      })
      .then((r) => r.data),

  /** One report, in any status. The map's list holds only open ones. */
  getById: (id: string) =>
    apiClient.get<Alert>(`/alerts/${id}`).then((r) => r.data),

  create: (data: CreateAlertRequest) =>
    apiClient.post<Alert>('/alerts', data).then((r) => r.data),

  resolve: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/resolve`).then((r) => r.data),

  /**
   * Hands the report to the authority it belongs to, saying why. Its authority or a
   * moderator; it goes back to SUBMITTED until it is mailed there.
   */
  forward: (id: string, authorityCode: string, reason: string) =>
    apiClient.post<Alert>(`/alerts/${id}/forward`, { authorityCode, reason }).then((r) => r.data),

  /** Where the report has been forwarded, oldest first. */
  forwards: (id: string) =>
    apiClient.get<ReportForward[]>(`/alerts/${id}/forwards`).then((r) => r.data),

  /** The authority that answers for the report has received it. Its own officials only. */
  acknowledge: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/acknowledge`).then((r) => r.data),

  /** The authority that answers for the report has started work on it. Its own officials only. */
  startWork: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/start-work`).then((r) => r.data),

  /** Closed without a fix, saying why. The report's authority or a moderator — not the reporter. */
  reject: (id: string, reason: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/reject`, { reason }).then((r) => r.data),

  /** Every rejection of the report, oldest first, with its dispute and decision. */
  rejections: (id: string) =>
    apiClient.get<Rejection[]>(`/alerts/${id}/rejections`).then((r) => r.data),

  /** The reporter contests the rejection of their report, once, saying why. */
  disputeRejection: (id: string, reason: string) =>
    apiClient.post<Rejection>(`/alerts/${id}/rejections/dispute`, { reason }).then((r) => r.data),

  /** A moderator upholds a disputed rejection or reopens the report. */
  decideDispute: (id: string, decision: RejectionDecision) =>
    apiClient.post<Alert>(`/alerts/${id}/rejections/decision`, { decision }).then((r) => r.data),

  /** Reports whose rejection is disputed and waiting for a moderator, oldest dispute first. */
  listDisputed: () =>
    apiClient.get<Alert[]>('/alerts/disputed').then((r) => r.data),

  /**
   * An official's working list: the reports their authority answers for. Which authority comes from
   * the account on the server — there is no parameter for it here, by design.
   */
  listForOwnAuthority: (statuses: AlertStatus[] = []) =>
    apiClient
      .get<Alert[]>('/alerts/assigned', {
        params: { status: statuses },
        paramsSerializer: { indexes: null },
      })
      .then((r) => r.data),

  /** The public list. Needs no session. */
  listRanked: (params: { ranking: ReportRanking; district?: string; statuses?: AlertStatus[]; overdue?: boolean; page?: number; size?: number }) =>
    apiClient
      .get<RankedReportsResponse>('/alerts/ranked', {
        params: {
          ranking: params.ranking,
          district: params.district || undefined,
          status: params.statuses ?? [],
          overdue: params.overdue || undefined,
          page: params.page ?? 0,
          size: params.size ?? 50,
        },
        paramsSerializer: { indexes: null },
      })
      .then((r) => r.data),
}
