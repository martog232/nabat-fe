import type { AlertStatus, AlertType } from '../../types'
import { ALERT_TYPE_LABELS, ALERT_TYPE_ICONS, OPEN_STATUSES, STATUS_LABELS } from '../../types'

export type StatusFilter = AlertStatus | 'ALL'

interface AlertFiltersProps {
  statusFilter: StatusFilter
  typeFilter: AlertType | 'ALL'
  onStatusChange: (s: StatusFilter) => void
  onTypeChange: (t: AlertType | 'ALL') => void
}

/**
 * Only the open states: the map shows nothing else, so a "Resolved" pill would always
 * filter to an empty list. Status replaced severity here — "has the district picked this
 * up yet" is the question worth narrowing a city map by.
 */
const STATUSES: StatusFilter[] = ['ALL', ...OPEN_STATUSES]

/**
 * Pill shared by both rows. `min-h` rather than vertical padding: a 24px-tall pill is a
 * miss on a touch screen, and the two rows have to agree on height or the header jitters
 * when one wraps.
 */
const pill = (active: boolean) => `
  flex-shrink-0 inline-flex items-center gap-1 px-3 min-h-[2rem] sm:min-h-[1.75rem]
  rounded-full text-xs font-medium transition-all cursor-pointer
  ${active
    ? 'bg-brand-600 text-white'
    : 'bg-surface-elevated text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
  }
`

export function AlertFilters({ statusFilter, typeFilter, onStatusChange, onTypeChange }: AlertFiltersProps) {
  return (
    <div className="space-y-2">
      {/* Status: five short labels, so wrapping to a second line is better than scrolling. */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => onStatusChange(s)} className={pill(statusFilter === s)}>
            {s === 'ALL' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/*
        Type: too many to wrap without eating the list, so this row scrolls sideways. It
        bleeds to the panel edge with negative margins and pads itself back, so the first and
        last pill are not clipped mid-glyph — and the scrollbar is hidden because a 4px bar
        inside a 32px row reads as damage.
      */}
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max">
          <button onClick={() => onTypeChange('ALL')} className={pill(typeFilter === 'ALL')}>
            All types
          </button>
          {(Object.keys(ALERT_TYPE_LABELS) as AlertType[]).map((t) => (
            <button key={t} onClick={() => onTypeChange(t)} className={pill(typeFilter === t)}>
              <span>{ALERT_TYPE_ICONS[t]}</span>
              <span className="whitespace-nowrap">{ALERT_TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
