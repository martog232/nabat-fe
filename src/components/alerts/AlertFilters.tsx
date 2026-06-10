import type { AlertSeverity, AlertType } from '../../types'
import { ALERT_TYPE_LABELS, ALERT_TYPE_ICONS } from '../../types'

type SeverityFilter = AlertSeverity | 'ALL'

interface AlertFiltersProps {
  severityFilter: SeverityFilter
  typeFilter: AlertType | 'ALL'
  onSeverityChange: (s: SeverityFilter) => void
  onTypeChange: (t: AlertType | 'ALL') => void
}

const SEVERITIES: SeverityFilter[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export function AlertFilters({ severityFilter, typeFilter, onSeverityChange, onTypeChange }: AlertFiltersProps) {
  return (
    <>
      <div className="flex gap-1.5 flex-wrap">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => onSeverityChange(s)}
            className={`
              px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer
              ${severityFilter === s
                ? 'bg-brand-600 text-white'
                : 'bg-surface-elevated text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }
            `}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto border-b border-surface-border">
        <button
          onClick={() => onTypeChange('ALL')}
          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${typeFilter === 'ALL' ? 'bg-brand-600 text-white' : 'bg-surface-elevated text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          All types
        </button>
        {(Object.keys(ALERT_TYPE_LABELS) as AlertType[]).map((t) => (
          <button
            key={t}
            onClick={() => onTypeChange(t)}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${typeFilter === t ? 'bg-brand-600 text-white' : 'bg-surface-elevated text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <span>{ALERT_TYPE_ICONS[t]}</span>
            <span>{ALERT_TYPE_LABELS[t]}</span>
          </button>
        ))}
      </div>
    </>
  )
}
