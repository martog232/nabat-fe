import { useState } from 'react'
import { type CategoryGroup } from '../../types'
import { GroupIcon } from '../common/GroupIcon'
import { useCategories } from '../../hooks/useCategories'

interface Props {
  /** The chosen subcategory, or null. */
  value: number | null
  onChange: (categoryCode: number) => void
  error?: string
}

/**
 * Call Sofia's catalogue in two steps: twelve groups as tiles, then the chosen group's
 * subcategories as a list.
 *
 * <p>Two steps because forty choices on one screen is a form nobody finishes, and because
 * the group is what a person can tell from the street ("something with the road") while
 * the subcategory needs the hint beside it ("дупки, пропаднала настилка") to be picked
 * right. A report is always filed under a subcategory — the server refuses a group.
 */
export function CategoryPicker({ value, onChange, error }: Props) {
  const { data: groups = [], isLoading, isError } = useCategories()
  const chosenGroup = value == null ? undefined : groups.find((g) => g.categories.some((c) => c.code === value))
  // Opens on the chosen subcategory's group, so changing one's mind starts where it was.
  const [openGroupCode, setOpenGroupCode] = useState<number | null>(chosenGroup?.code ?? null)
  const openGroup = groups.find((g) => g.code === openGroupCode)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Категория</span>
        {openGroup && (
          <button
            type="button"
            onClick={() => setOpenGroupCode(null)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer"
          >
            ← Всички групи
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Зареждане на категориите…</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          Категориите не можаха да се заредят. Проверете връзката си и опитайте отново.
        </p>
      )}

      {!openGroup && groups.length > 0 && (
        <div className="grid grid-cols-2 xs:grid-cols-3 gap-2" role="list" aria-label="Групи категории">
          {groups.map((g) => (
            <GroupTile
              key={g.code}
              group={g}
              selected={chosenGroup?.code === g.code}
              onClick={() => setOpenGroupCode(g.code)}
            />
          ))}
        </div>
      )}

      {openGroup && (
        <div
          className="rounded-xl border border-surface-border overflow-hidden"
          style={{ borderLeft: `4px solid ${openGroup.color}` }}
        >
          <p className="px-3 py-2 text-sm font-semibold text-slate-900 bg-surface-elevated">
            <GroupIcon code={openGroup.code} className="mr-1.5 inline h-4 w-4 align-[-2px]" style={{ color: openGroup.color }} />
            {openGroup.name}
          </p>
          <ul role="radiogroup" aria-label={openGroup.name} className="divide-y divide-surface-border">
            {openGroup.categories.map((c) => {
              const selected = value === c.code
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange(c.code)}
                    className={`
                      w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors cursor-pointer
                      ${selected ? 'bg-brand-50' : 'bg-surface-card hover:bg-surface-hover'}
                    `}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${selected ? 'border-brand-600 bg-brand-600' : 'border-slate-300'}`}
                    />
                    <span className="min-w-0">
                      <span className={`block text-sm ${selected ? 'font-semibold text-brand-700' : 'text-slate-800'}`}>
                        {c.name}
                      </span>
                      {c.hint && <span className="block text-xs text-slate-500">{c.hint}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function GroupTile({ group, selected, onClick }: { group: CategoryGroup; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="listitem"
      onClick={onClick}
      aria-label={selected ? `${group.name} (избрана)` : group.name}
      className={`
        flex items-center gap-2 min-h-[3.25rem] px-3 py-2 rounded-xl border text-left text-xs transition-all cursor-pointer
        ${selected ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold' : 'border-surface-border bg-surface-elevated text-slate-700 hover:bg-surface-hover'}
      `}
      style={{ borderLeft: `4px solid ${group.color}` }}
    >
      <GroupIcon code={group.code} className="h-5 w-5 flex-shrink-0" style={{ color: group.color }} />
      <span className="leading-tight">{group.name}</span>
    </button>
  )
}
