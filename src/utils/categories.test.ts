import { describe, it, expect } from 'vitest'
import { buildCategoryIndex, matchesCategory, resolveCategory } from './categories'
import { TEST_CATEGORIES } from '../test/categories'

const index = buildCategoryIndex(TEST_CATEGORIES)

describe('resolveCategory', () => {
  it('finds a subcategory and the group it is in', () => {
    const resolved = resolveCategory(index, 1020)
    expect(resolved?.category.name).toBe('Неправилно паркиране')
    expect(resolved?.group.name).toBe('Автомобили')
  })

  /** A report is never filed under a group, so a group code is not a report's category. */
  it('does not resolve a group code as a category', () => {
    expect(resolveCategory(index, 1018)).toBeUndefined()
  })

  it('resolves nothing before the catalogue has loaded', () => {
    expect(resolveCategory(buildCategoryIndex(undefined), 1007)).toBeUndefined()
  })
})

describe('matchesCategory', () => {
  it('lets everything through without a filter', () => {
    expect(matchesCategory(index, 1007, null)).toBe(true)
  })

  it('matches every subcategory of a group, and nothing outside it', () => {
    expect(matchesCategory(index, 1007, 1006)).toBe(true)
    expect(matchesCategory(index, 1008, 1006)).toBe(true)
    expect(matchesCategory(index, 1019, 1006)).toBe(false)
  })

  it('matches a subcategory filter exactly', () => {
    expect(matchesCategory(index, 1007, 1007)).toBe(true)
    expect(matchesCategory(index, 1008, 1007)).toBe(false)
  })

  /** Without the catalogue the group of a code is unknown, so only an exact match counts. */
  it('only matches exactly when the catalogue is missing', () => {
    const empty = buildCategoryIndex(undefined)
    expect(matchesCategory(empty, 1007, 1006)).toBe(false)
    expect(matchesCategory(empty, 1007, 1007)).toBe(true)
  })
})
