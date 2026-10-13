import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '../api/categories'
import { buildCategoryIndex, resolveCategory, type CategoryIndex, type ResolvedCategory } from '../utils/categories'

export const CATEGORIES_QUERY_KEY = ['categories'] as const

/**
 * Call Sofia's catalogue. Fetched once per session: it changes with a server migration, and
 * every report on screen names one of its entries.
 */
export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: categoriesApi.list,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Every catalogue code to what it is. Empty until the catalogue has loaded. */
export function useCategoryIndex(): CategoryIndex {
  const { data } = useCategories()
  return useMemo(() => buildCategoryIndex(data), [data])
}

/** A report's subcategory and group, or undefined until the catalogue is known. */
export function useResolvedCategory(code: number): ResolvedCategory | undefined {
  const index = useCategoryIndex()
  return resolveCategory(index, code)
}
