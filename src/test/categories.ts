import { QueryClient } from '@tanstack/react-query'
import type { CategoryGroup } from '../types'
import { CATEGORIES_QUERY_KEY } from '../hooks/useCategories'

/** Two of Call Sofia's groups, with real codes, enough for components to resolve a report. */
export const TEST_CATEGORIES: CategoryGroup[] = [
  {
    code: 1006,
    name: 'Пътища и шахти',
    color: '#1e3a8a',
    categories: [
      { code: 1007, name: 'Улично платно', hint: 'дупки, пропаднала настилка, шахти без капак' },
      { code: 1008, name: 'Тротоар', hint: 'счупени плочки, бордюри' },
    ],
  },
  {
    code: 1018,
    name: 'Автомобили',
    color: '#06b6d4',
    categories: [
      { code: 1019, name: 'Изоставени автомобили', hint: null },
      { code: 1020, name: 'Неправилно паркиране', hint: 'на тротоар, на пешеходна пътека' },
    ],
  },
]

/** A client that already holds the catalogue, as it would after the first page load. */
export function queryClientWithCategories(): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(CATEGORIES_QUERY_KEY, TEST_CATEGORIES)
  return qc
}
