import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authoritiesApi } from '../api/authorities'

/**
 * Everyone reports go to: the 24 districts and the city-wide institutions. Fetched once per
 * session, like the districts — reference data that changes with a server migration.
 */
export function useAuthorities() {
  return useQuery({
    queryKey: ['authorities'],
    queryFn: authoritiesApi.list,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Authority names by code, for turning a report's or an official's `authorityCode` into a name. */
export function useAuthorityNames(): Map<string, string> {
  const { data } = useAuthorities()
  return useMemo(() => new Map((data ?? []).map((a) => [a.code, a.name])), [data])
}
