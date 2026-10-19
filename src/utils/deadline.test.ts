import { describe, it, expect } from 'vitest'
import { overdueDays } from './deadline'

const now = new Date('2026-10-20T12:00:00Z').getTime()

describe('overdueDays', () => {
  it('is nothing while there is no deadline running', () => {
    expect(overdueDays({ answerDueAt: null }, now)).toBeNull()
  })

  it('is nothing before the deadline', () => {
    expect(overdueDays({ answerDueAt: '2026-10-21T12:00:00Z' }, now)).toBeNull()
  })

  /** A few hours late is late: one day, not zero. */
  it('counts whole days past it, rounded up', () => {
    expect(overdueDays({ answerDueAt: '2026-10-20T09:00:00Z' }, now)).toBe(1)
    expect(overdueDays({ answerDueAt: '2026-10-10T12:00:00Z' }, now)).toBe(10)
  })
})
