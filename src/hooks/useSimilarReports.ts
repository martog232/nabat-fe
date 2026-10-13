import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { alertsApi } from '../api/alerts'

/** How long the pin has to stay put before the check is asked again. */
export const SIMILAR_DEBOUNCE_MS = 400

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

/**
 * "Is this already reported?" for the report being written.
 *
 * Off until there is a place and a subcategory to ask about. The place is debounced:
 * dragging the pin moves it on every frame, and each position is not a question anyone
 * asked. Rounded to ~1 m for the key, so a pin that settles back where it was reuses the
 * answer rather than asking again.
 */
export function useSimilarReports(lat: number | null, lng: number | null, categoryCode: number | null) {
  const point = useDebounced(
    lat != null && lng != null ? `${lat.toFixed(5)},${lng.toFixed(5)}` : null,
    SIMILAR_DEBOUNCE_MS,
  )
  const [qLat, qLng] = point ? point.split(',').map(Number) : [null, null]
  const enabled = qLat != null && qLng != null && categoryCode != null

  return useQuery({
    queryKey: ['alerts', 'similar', point, categoryCode] as const,
    queryFn: () => alertsApi.similar(qLat as number, qLng as number, categoryCode as number),
    enabled,
    staleTime: 30_000,
    // Never in the way of filing: an error just means no advice.
    retry: false,
    // Keep showing the last answer while the pin moves, so the panel does not flicker —
    // but not across a change of category, where the old matches are for something else.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[3] === categoryCode ? keepPreviousData(previous) : undefined,
  })
}
