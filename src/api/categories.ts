import type { CategoryGroup } from '../types'
import { apiClient } from './client'

export const categoriesApi = {
  /**
   * Call Sofia's catalogue: twelve groups, each with its subcategories, in display order.
   * Public, and changes with a server migration, not with use.
   */
  list: () => apiClient.get<CategoryGroup[]>('/categories').then((r) => r.data),
}
