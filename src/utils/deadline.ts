import type { Alert } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Whole days a report is past the deadline for its authority's answer, or null when it is not
 * overdue — in time, answered, or closed (the server clears the deadline then). Counted from
 * the deadline, rounded up: a report a few hours late is late, and says "1 day".
 */
export function overdueDays(alert: Pick<Alert, 'answerDueAt'>, now: number = Date.now()): number | null {
  if (!alert.answerDueAt) return null
  const late = now - new Date(alert.answerDueAt).getTime()
  return late > 0 ? Math.ceil(late / DAY_MS) : null
}
