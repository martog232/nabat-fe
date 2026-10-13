import type {
  Alert,
  AlertStatus,
  CreateAlertRequest,
  NearbyAlertsResponse,
  RankedReportsResponse,
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

  /** The district has received the report. Its own officials only. */
  acknowledge: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/acknowledge`).then((r) => r.data),

  /** The district has started work on it. Its own officials only. */
  startWork: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/start-work`).then((r) => r.data),

  /** Closed without a fix. The district or a moderator — not the reporter. */
  reject: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/reject`).then((r) => r.data),

  /**
   * An official's working list: the reports in their own district. Which district comes from
   * the account on the server — there is no parameter for it here, by design.
   */
  listForOwnDistrict: (statuses: AlertStatus[] = []) =>
    apiClient
      .get<Alert[]>('/alerts/district', {
        params: { status: statuses },
        paramsSerializer: { indexes: null },
      })
      .then((r) => r.data),

  /** The public list. Needs no session. */
  listRanked: (params: { ranking: ReportRanking; district?: string; statuses?: AlertStatus[]; page?: number; size?: number }) =>
    apiClient
      .get<RankedReportsResponse>('/alerts/ranked', {
        params: {
          ranking: params.ranking,
          district: params.district || undefined,
          status: params.statuses ?? [],
          page: params.page ?? 0,
          size: params.size ?? 50,
        },
        paramsSerializer: { indexes: null },
      })
      .then((r) => r.data),
}
