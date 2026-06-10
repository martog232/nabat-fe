import type { UserPreferencesResponse } from '../types'
import { apiClient } from './client'

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
