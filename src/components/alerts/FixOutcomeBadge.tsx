import type { Alert } from '../../types'
import { FIX_OUTCOME_COLORS, FIX_OUTCOME_LABELS } from '../../types'
import { CircleCheck, TriangleAlert, Waves } from 'lucide-react'

/**
 * What people say about a resolved report: confirmed, disputed or mixed. Nothing for an open
 * report, and nothing for one nobody has checked — "unchecked" on every row would be noise.
 */
export function FixOutcomeBadge({ alert }: { alert: Alert }) {
  const outcome = alert.fixCheck?.outcome ?? 'UNCHECKED'
  if (alert.status !== 'RESOLVED' || outcome === 'UNCHECKED') return null

  const Icon = outcome === 'CONFIRMED' ? CircleCheck : outcome === 'DISPUTED' ? TriangleAlert : Waves
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${FIX_OUTCOME_COLORS[outcome]}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {FIX_OUTCOME_LABELS[outcome]}
    </span>
  )
}
