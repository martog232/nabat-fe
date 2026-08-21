import type { Alert, CreateAlertRequest, NearbyAlertsResponse } from '../types'
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
  getNearby: (lat: number, lng: number, radiusKm = 5) =>
    apiClient
      .get<NearbyAlertsResponse>('/alerts/nearby', { params: { latitude: lat, longitude: lng, radiusKm } })
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

  create: (data: CreateAlertRequest) =>
    apiClient.post<Alert>('/alerts', data).then((r) => r.data),

  resolve: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/resolve`).then((r) => r.data),
}
