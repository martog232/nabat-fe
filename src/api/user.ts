import { apiClient } from './client'

export interface UserPreferencesResponse {
  notificationRadiusKm: number
}

export const userApi = {
  updatePreferences: (prefs: {
    notificationRadiusKm: number
    lastKnownLat?: number | null
    lastKnownLng?: number | null
  }) =>
    apiClient
      .patch<UserPreferencesResponse>('/users/me/preferences', prefs)
      .then((r) => r.data),
}
