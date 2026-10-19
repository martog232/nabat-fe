import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRankedReports } from '../hooks/useAlerts'
import { useDistricts, useDistrictNames } from '../hooks/useDistricts'
import { useAuthStore } from '../store/authStore'
import { StatusBadge } from '../components/common/Badge'
import { FixOutcomeBadge } from '../components/alerts/FixOutcomeBadge'
import { OverdueBadge } from '../components/alerts/OverdueBadge'
import { FixCheckPanel } from '../components/alerts/FixCheckPanel'
import { GroupIcon } from '../components/common/GroupIcon'
import type { Alert, AlertStatus, ReportRanking } from '../types'
import {
  CLOSED_BY_LABELS,
  OPEN_STATUSES,
  RANKING_LABELS,
} from '../types'
import { useCategoryIndex } from '../hooks/useCategories'
import { resolveCategory } from '../utils/categories'

const PAGE_SIZE = 25

const RANKINGS: ReportRanking[] = ['HOT', 'LONGEST_WAITING', 'NEWEST']

/** Why each order exists, said once above the list rather than left for the reader to guess. */
const RANKING_HINTS: Record<ReportRanking, string> = {
  HOT: 'Подкрепата от други хора, претеглена спрямо възрастта — така нов проблем може да изпревари стар.',
  LONGEST_WAITING: 'Отворени сигнали, най-старите първи: това, което чака най-дълго.',
  NEWEST: 'Най-новите сигнали първи.',
}

const STATE_FILTERS: { label: string; statuses: AlertStatus[] }[] = [
  { label: 'Отворени', statuses: [...OPEN_STATUSES] },
  { label: 'Решени', statuses: ['RESOLVED'] },
  { label: 'Отхвърлени', statuses: ['REJECTED'] },
]

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

function age(alert: Alert): string {
  const days = daysSince(alert.createdAt)
  const span = days === 1 ? '1 ден' : `${days} дни`
  if (alert.status === 'RESOLVED' || alert.status === 'REJECTED') return days === 0 ? 'подаден днес' : `подаден преди ${span}`
  return days === 0 ? 'подаден днес' : `чака ${span}`
}

/**
 * Every report in Sofia, or one district's, for anyone to read — signed in or not.
 *
 * The reason this page exists: what a district has been told, and what it has done about it,
 * is visible to the people who told it and to anyone else who wants to look. Nothing here is
 * more than the map shows a signed-in user, and the reporter never appears at all.
 */
export function ReportsPage() {
  const user = useAuthStore((s) => s.user)
  const [ranking, setRanking] = useState<ReportRanking>('HOT')
  const [district, setDistrict] = useState('')
  const [stateFilter, setStateFilter] = useState(0)
  // Only reports past the deadline for their authority's answer: who has left whom waiting.
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [checking, setChecking] = useState<string | null>(null)

  const { data: districts = [] } = useDistricts()
  const districtNames = useDistrictNames()
  const categoryIndex = useCategoryIndex()
  const { data, isLoading, isError, isFetching } = useRankedReports({
    ranking,
    district: district || undefined,
    statuses: STATE_FILTERS[stateFilter].statuses,
    overdue: overdueOnly,
    page,
    size: PAGE_SIZE,
  })

  const reports = data?.alerts ?? []
  const total = data?.total ?? 0
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)

  // Any change of filter starts again from the first page; staying on page 4 of a list that
  // now has one page would show nothing and look like an empty city.
  const choose = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0) }

  const pill = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-brand-600 text-white'
        : 'bg-surface-elevated text-slate-600 hover:text-slate-900'
    }`

  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT">
      <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Сигнали в София</h1>
            <p className="text-sm text-slate-600">
              Какво е подадено, до кого е изпратено и какво се е случило оттогава.{' '}
              <Link to="/districts" className="font-medium text-brand-600 hover:underline">
                Как отговарят районите →
              </Link>
            </p>
          </div>
          <Link
            to={user ? '/map' : '/login'}
            className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-hover"
          >
            {user ? 'Обратно към картата' : 'Вход, за да подадете сигнал'}
          </Link>
        </header>

        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Подредба">
          {RANKINGS.map((r) => (
            <button key={r} type="button" role="tab" aria-selected={ranking === r} onClick={() => choose(setRanking)(r)} className={pill(ranking === r)}>
              {RANKING_LABELS[r]}
            </button>
          ))}
        </div>
        <p className="mb-5 text-xs text-slate-500">{RANKING_HINTS[ranking]}</p>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {STATE_FILTERS.map((f, i) => (
            <button key={f.label} type="button" aria-pressed={stateFilter === i} onClick={() => choose(setStateFilter)(i)} className={pill(stateFilter === i)}>
              {f.label}
            </button>
          ))}
          <button type="button" aria-pressed={overdueOnly} onClick={() => choose(setOverdueOnly)(!overdueOnly)} className={pill(overdueOnly)}>
            Само просрочени
          </button>
          <label className="sr-only" htmlFor="district-filter">Район</label>
          <select
            id="district-filter"
            value={district}
            onChange={(e) => choose(setDistrict)(e.target.value)}
            className="ml-auto rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-800"
          >
            <option value="">Цяла София</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
        </div>

        {isLoading && <p className="text-sm text-slate-600">Зареждане…</p>}
        {isError && (
          <p role="alert" className="text-sm text-red-600">
            Сигналите не можаха да се заредят. Проверете връзката си и опитайте отново.
          </p>
        )}
        {!isLoading && !isError && reports.length === 0 && (
          <p className="text-sm text-slate-600">Няма сигнали, които да отговарят.</p>
        )}

        <ol className={`space-y-3 transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`} start={page * PAGE_SIZE + 1}>
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <GroupIcon code={resolveCategory(categoryIndex, r.categoryCode)?.group.code} className="h-6 w-6 flex-shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900">{r.title}</p>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <OverdueBadge alert={r} />
                      <FixOutcomeBadge alert={r} />
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-700">{r.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {resolveCategory(categoryIndex, r.categoryCode)?.category.name ?? '—'}
                    {r.districtCode && ` · ${districtNames.get(r.districtCode) ?? r.districtCode}`}
                    {` · ${age(r)}`}
                    {` · подкрепа: ${Math.max(0, r.confirmationCount + r.upvoteCount - r.downvoteCount)}`}
                    {r.closedBy && ` · затворен ${CLOSED_BY_LABELS[r.closedBy]}`}
                  </p>
                  {/* A resolved report is where the district's word gets checked. Opened per
                      row, so a page of 25 does not ask the server 25 times. */}
                  {r.status === 'RESOLVED' && (
                    <div className="mt-3">
                      {checking === r.id ? (
                        <FixCheckPanel alert={r} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setChecking(r.id)}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          Наистина ли е оправено?
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {total > PAGE_SIZE && (
          <nav className="mt-8 flex items-center justify-between" aria-label="Страници">
            <button type="button" className={pill(false)} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Предишна
            </button>
            <span className="text-sm text-slate-600">
              Страница {page + 1} от {lastPage + 1} · {total} сигнала
            </span>
            <button type="button" className={pill(false)} disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))}>
              Следваща
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
