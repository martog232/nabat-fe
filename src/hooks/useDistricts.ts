import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { districtsApi } from '../api/districts'

/**
 * The 24 districts of Sofia. Fetched once per session: the list is reference data that
 * changes with a server migration, and every report on screen names one.
 */
export function useDistricts() {
  return useQuery({
    queryKey: ['districts'],
    queryFn: districtsApi.list,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** District names by code, for turning a report's `districtCode` into something to show. */
export function useDistrictNames(): Map<string, string> {
  const { data } = useDistricts()
  return useMemo(() => new Map((data ?? []).map((d) => [d.code, d.name])), [data])
}
