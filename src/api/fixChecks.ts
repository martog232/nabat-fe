import type { FixCheckResponse, FixVerdict } from '../types'
import { apiClient } from './client'

/** "Is it really fixed?" on a resolved report. One answer per person. */
export const fixChecksApi = {
  get: (alertId: string) =>
    apiClient.get<FixCheckResponse>(`/alerts/${alertId}/fix-check`).then((r) => r.data),

  /** Sets or changes the caller's answer. 409 if the report is not resolved, 403 for its own district. */
  check: (alertId: string, verdict: FixVerdict) =>
    apiClient.put<FixCheckResponse>(`/alerts/${alertId}/fix-check`, { verdict }).then((r) => r.data),

  withdraw: (alertId: string) =>
    apiClient.delete<FixCheckResponse>(`/alerts/${alertId}/fix-check`).then((r) => r.data),
}
