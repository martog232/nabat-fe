import { useQuery } from '@tanstack/react-query'
import { districtComparisonApi } from '../api/districtComparison'
import type { ComparisonPeriod } from '../types'

/**
 * The comparison changes only when the archive is imported again, so an hour is generous.
 * The previous period stays on screen while the next loads, rather than the table emptying
 * and refilling on every change of year.
 */
export function useDistrictComparison(period: ComparisonPeriod) {
  return useQuery({
    queryKey: ['district-comparison', period.from ?? null, period.to ?? null],
    queryFn: () => districtComparisonApi.get(period),
    staleTime: 60 * 60 * 1000,
    placeholderData: (previous) => previous,
  })
}
