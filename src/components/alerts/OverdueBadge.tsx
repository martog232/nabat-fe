import type { Alert } from '../../types'
import { overdueDays } from '../../utils/deadline'

/**
 * "Просрочен с N дни" — on a report its authority has left past the deadline for an answer.
 * Nothing at all on one in time or answered: the badge is for the ones somebody should see.
 */
export function OverdueBadge({ alert }: { alert: Pick<Alert, 'answerDueAt'> }) {
  const days = overdueDays(alert)
  if (days === null) return null
  return (
    <span
      className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600"
      title="Отговорната институция не е отговорила в срок"
    >
      Просрочен с {days} {days === 1 ? 'ден' : 'дни'}
    </span>
  )
}
