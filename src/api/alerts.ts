import type { Alert, CreateAlertRequest } from '../types'
import { apiClient } from './client'

export const alertsApi = {
  getNearby: (lat: number, lng: number, radiusKm = 5) =>
    apiClient
      .get<Alert[]>('/alerts/nearby', { params: { latitude: lat, longitude: lng, radiusKm } })
      .then((r) => r.data),

  /**
   * Fetch alerts created at or after `since` (ISO 8601) within the given radius.
   * Used for catch-up after a WebSocket reconnect to retrieve missed events.
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
