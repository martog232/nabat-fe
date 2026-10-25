import type { District } from '../types'
import { apiClient } from './client'

export const districtsApi = {
  /** The 24 districts of Sofia. Public, and changes with a server migration, not with use. */
  list: () => apiClient.get<District[]>('/districts').then((r) => r.data),
}
