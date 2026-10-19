import { apiClient } from './client'
import type { Authority } from '../types'

export const authoritiesApi = {
  /** The districts, then the institutions. Public, and changes with a server migration. */
  list: () => apiClient.get<Authority[]>('/authorities').then((r) => r.data),
}
