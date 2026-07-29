import type { Alert, CreateAlertRequest } from '../types'
import { apiClient } from './client'

export const alertsApi = {
  getNearby: (lat: number, lng: number, radiusKm = 5) =>
    apiClient
      .get<Alert[]>('/alerts/nearby', { params: { latitude: lat, longitude: lng, radiusKm } })
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
      .get<Alert[]>('/alerts/nearby', { params: { latitude: lat, longitude: lng, radiusKm, since } })
      .then((r) => r.data),

  create: (data: CreateAlertRequest) =>
    apiClient.post<Alert>('/alerts', data).then((r) => r.data),

  resolve: (id: string) =>
    apiClient.patch<Alert>(`/alerts/${id}/resolve`).then((r) => r.data),
}
