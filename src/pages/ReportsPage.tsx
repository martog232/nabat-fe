import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRankedReports } from '../hooks/useAlerts'
import { useDistricts, useDistrictNames } from '../hooks/useDistricts'
import { useAuthStore } from '../store/authStore'
import { StatusBadge } from '../components/common/Badge'
import type { Alert, AlertStatus, ReportRanking } from '../types'
import {
  ALERT_TYPE_ICONS,
  ALERT_TYPE_LABELS,
  CLOSED_BY_LABELS,
  OPEN_STATUSES,
  RANKING_LABELS,
} from '../types'

const PAGE_SIZE = 25

const RANKINGS: ReportRanking[] = ['HOT', 'LONGEST_WAITING', 'NEWEST']

/** Why each order exists, said once above the list rather than left for the reader to guess. */
const RANKING_HINTS: Record<ReportRanking, string> = {
  HOT: 'Support from other people, weighed against age — so a new problem can climb past an old one.',
  LONGEST_WAITING: 'Open reports, oldest first: what has been left waiting longest.',
  NEWEST: 'The most recent reports first.',
}

const STATE_FILTERS: { label: string; statuses: AlertStatus[] }[] = [
  { label: 'Open', statuses: [...OPEN_STATUSES] },
  { label: 'Resolved', statuses: ['RESOLVED'] },
  { label: 'Rejected', statuses: ['REJECTED'] },
]

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

function age(alert: Alert): string {
  const days = daysSince(alert.createdAt)
  const span = days === 0 ? 'today' : days === 1 ? '1 day' : `${days} days`
  if (alert.status === 'RESOLVED' || alert.status === 'REJECTED') return `reported ${days === 0 ? 'today' : `${span} ago`}`
  return days === 0 ? 'reported today' : `waiting ${span}`
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
  const [page, setPage] = useState(0)

  const { data: districts = [] } = useDistricts()
  const districtNames = useDistrictNames()
  const { data, isLoading, isError, isFetching } = useRankedReports({
    ranking,
    district: district || undefined,
    statuses: STATE_FILTERS[stateFilter].statuses,
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports in Sofia</h1>
            <p className="text-sm text-slate-600">
              What has been reported, where it was sent, and what has happened since.
            </p>
          </div>
          <Link
            to={user ? '/map' : '/login'}
            className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-hover"
          >
            {user ? 'Back to the map' : 'Sign in to report'}
          </Link>
        </header>

        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Order">
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
          <label className="sr-only" htmlFor="district-filter">District</label>
          <select
            id="district-filter"
            value={district}
            onChange={(e) => choose(setDistrict)(e.target.value)}
            className="ml-auto rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-800"
          >
            <option value="">All of Sofia</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
        </div>

        {isLoading && <p className="text-sm text-slate-600">Loading…</p>}
        {isError && (
          <p role="alert" className="text-sm text-red-600">
            The reports could not be loaded. Check your connection and try again.
          </p>
        )}
        {!isLoading && !isError && reports.length === 0 && (
          <p className="text-sm text-slate-600">No reports match.</p>
        )}

        <ol className={`space-y-3 transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`} start={page * PAGE_SIZE + 1}>
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-2xl" aria-hidden>{ALERT_TYPE_ICONS[r.type]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900">{r.title}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-700">{r.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {ALERT_TYPE_LABELS[r.type]}
                    {r.districtCode && ` · ${districtNames.get(r.districtCode) ?? r.districtCode}`}
                    {` · ${age(r)}`}
                    {` · ${Math.max(0, r.confirmationCount + r.upvoteCount - r.downvoteCount)} supporting`}
                    {r.closedBy && ` · closed ${CLOSED_BY_LABELS[r.closedBy]}`}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {total > PAGE_SIZE && (
          <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
            <button type="button" className={pill(false)} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page + 1} of {lastPage + 1} · {total} reports
            </span>
            <button type="button" className={pill(false)} disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))}>
              Next
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
