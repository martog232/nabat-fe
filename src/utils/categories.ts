import type { Category, CategoryGroup } from '../types'

/** A subcategory together with the group it belongs to. */
export interface ResolvedCategory {
  category: Category
  group: CategoryGroup
}

/**
 * Every code in the catalogue — groups and subcategories — to what it is.
 *
 * <p>A group resolves to itself as `group` with no `category`; a subcategory to both. One
 * lookup serves both the reports (which carry a subcategory) and the filter (which holds a
 * group), so nothing else needs to walk the tree.
 */
export type CategoryIndex = Map<number, { group: CategoryGroup; category?: Category }>

export function buildCategoryIndex(groups: CategoryGroup[] | undefined): CategoryIndex {
  const index: CategoryIndex = new Map()
  for (const group of groups ?? []) {
    index.set(group.code, { group })
    for (const category of group.categories) {
      index.set(category.code, { group, category })
    }
  }
  return index
}

/**
 * The subcategory a report was filed under, and its group. Undefined while the catalogue is
 * still loading or for a code it does not know — callers show nothing rather than a guess.
 */
export function resolveCategory(index: CategoryIndex, code: number): ResolvedCategory | undefined {
  const entry = index.get(code)
  return entry?.category ? { category: entry.category, group: entry.group } : undefined
}

/**
 * Whether a report with `categoryCode` belongs under `filter`, which may be a group or a
 * subcategory code — the same rule the server applies to `?category=`. Without the
 * catalogue only an exact match can be known.
 */
export function matchesCategory(index: CategoryIndex, categoryCode: number, filter: number | null): boolean {
  if (filter == null || categoryCode === filter) return true
  return index.get(categoryCode)?.group.code === filter
}
