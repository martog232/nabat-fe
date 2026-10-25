import type { AlertStatus } from '../../types'
import { STATUS_COLORS, STATUS_LABELS } from '../../types'

interface StatusBadgeProps {
  status: AlertStatus
  label?: string
}

/** Where a report is on its way to a fix. Replaced the severity badge when severity went. */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]}`}
    >
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}
