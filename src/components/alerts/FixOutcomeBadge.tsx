import type { Alert } from '../../types'
import { FIX_OUTCOME_COLORS, FIX_OUTCOME_LABELS } from '../../types'

/**
 * What people say about a resolved report: confirmed, disputed or mixed. Nothing for an open
 * report, and nothing for one nobody has checked — "unchecked" on every row would be noise.
 */
export function FixOutcomeBadge({ alert }: { alert: Alert }) {
  const outcome = alert.fixCheck?.outcome ?? 'UNCHECKED'
  if (alert.status !== 'RESOLVED' || outcome === 'UNCHECKED') return null

  const icon = outcome === 'CONFIRMED' ? '✔' : outcome === 'DISPUTED' ? '⚠' : '≈'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${FIX_OUTCOME_COLORS[outcome]}`}
    >
      <span aria-hidden>{icon}</span>
      {FIX_OUTCOME_LABELS[outcome]}
    </span>
  )
}
