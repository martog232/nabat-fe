import type { AlertStatus } from '../../types'
import { OPEN_STATUSES, STATUS_LABELS } from '../../types'
import { GroupIcon } from '../common/GroupIcon'
import { useCategories } from '../../hooks/useCategories'

export type StatusFilter = AlertStatus | 'ALL'

interface AlertFiltersProps {
  statusFilter: StatusFilter
  /** A category group code, or null for all. */
  categoryFilter: number | null
  onStatusChange: (s: StatusFilter) => void
  onCategoryChange: (groupCode: number | null) => void
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
    : 'bg-surface-elevated text-slate-600 hover:text-slate-800'
  }
`

export function AlertFilters({ statusFilter, categoryFilter, onStatusChange, onCategoryChange }: AlertFiltersProps) {
  const { data: groups = [] } = useCategories()

  return (
    <div className="space-y-2">
      {/* Status: five short labels, so wrapping to a second line is better than scrolling. */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => onStatusChange(s)} className={pill(statusFilter === s)}>
            {s === 'ALL' ? 'Всички' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/*
        Category groups: twelve, too many to wrap without eating the list, so this row
        scrolls sideways. It bleeds to the panel edge with negative margins and pads itself
        back, so the first and last pill are not clipped mid-glyph — and the scrollbar is
        hidden because a 4px bar inside a 32px row reads as damage. Groups rather than the
        forty subcategories: a filter is for narrowing a map, not for filing a report.
      */}
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max">
          <button onClick={() => onCategoryChange(null)} className={pill(categoryFilter === null)}>
            Всички категории
          </button>
          {groups.map((g) => (
            <button key={g.code} onClick={() => onCategoryChange(g.code)} className={pill(categoryFilter === g.code)}>
              <GroupIcon code={g.code} className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">{g.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
