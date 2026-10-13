import type { Alert } from '../../types'
import { groupIcon } from '../../types'
import { StatusBadge } from '../common/Badge'
import { useAlertStore } from '../../store/alertStore'
import { useResolvedCategory } from '../../hooks/useCategories'

interface AlertCardProps {
  alert: Alert
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Току-що'
  if (mins < 60) return `преди ${mins} мин`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `преди ${hrs} ч`
  return `преди ${Math.floor(hrs / 24)} д`
}

export function AlertCard({ alert }: AlertCardProps) {
  const selectedAlertId = useAlertStore((s) => s.selectedAlertId)
  const selectAlert = useAlertStore((s) => s.selectAlert)
  const isSelected = selectedAlertId === alert.id
  const resolved = useResolvedCategory(alert.categoryCode)

  return (
    <button
      onClick={() => selectAlert(isSelected ? null : alert.id)}
      className={`
        w-full text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer
        ${isSelected
          ? 'bg-surface-elevated border-brand-500/50 shadow-lg shadow-brand-600/10'
          : 'bg-surface-card border-surface-border hover:border-surface-elevated hover:bg-surface-elevated/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-0.5" aria-hidden>{groupIcon(resolved?.group.code)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="font-semibold text-sm text-slate-900 truncate">{alert.title}</span>
            <span className="text-xs text-slate-500 whitespace-nowrap">{timeAgo(alert.createdAt)}</span>
          </div>
          <p className="text-xs text-slate-600 line-clamp-2 mb-1.5">{alert.description}</p>
          <div className="flex items-center gap-2">
            {resolved && <span className="text-xs text-slate-500">{resolved.category.name}</span>}
            <StatusBadge status={alert.status} />
          </div>
        </div>
      </div>
    </button>
  )
}
