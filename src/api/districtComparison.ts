import type { ComparisonPeriod, DistrictComparison } from '../types'
import { apiClient } from './client'

export const districtComparisonApi = {
  /** Public. Both dates optional: without them, the archive's last twelve months. */
  get: (period: ComparisonPeriod = {}) =>
    apiClient
      .get<DistrictComparison>('/call-sofia/district-comparison', {
        params: { from: period.from, to: period.to },
      })
      .then((r) => r.data),
}
