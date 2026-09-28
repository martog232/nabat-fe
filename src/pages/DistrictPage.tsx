import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDistrictReports } from '../hooks/useAlerts'
import { useDistrictNames } from '../hooks/useDistricts'
import { useAuthStore } from '../store/authStore'
import { ReportActions } from '../components/alerts/ReportActions'
import { StatusBadge } from '../components/common/Badge'
import type { AlertStatus } from '../types'
import { ALERT_TYPE_ICONS, ALERT_TYPE_LABELS, OPEN_STATUSES } from '../types'

/** The three piles an official works through. "Open" is everything still waiting on them. */
const TABS: { label: string; statuses: AlertStatus[] }[] = [
  { label: 'Open', statuses: [...OPEN_STATUSES] },
  { label: 'Resolved', statuses: ['RESOLVED'] },
  { label: 'Rejected', statuses: ['REJECTED'] },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * A district official's working list: every report in their own district, newest first,
 * with what they may do to each right beside it.
 *
 * The district is the account's, and the server takes it from there — this page never names
 * one in a request, so there is no way to point it at somebody else's.
 */
export function DistrictPage() {
  const user = useAuthStore((s) => s.user)
  const districtNames = useDistrictNames()
  const [tab, setTab] = useState(0)
  const { data: reports = [], isLoading, isError } = useDistrictReports(TABS[tab].statuses)

  const districtName = user?.districtCode ? districtNames.get(user.districtCode) ?? user.districtCode : ''

  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT">
      <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <header className="mb-6 flex items-center gap-3">
          <Link
            to="/map"
            aria-label="Back to the map"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-card text-slate-600 transition-colors hover:bg-surface-hover dark:text-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{districtName}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Reports sent to your district</p>
          </div>
        </header>

        <div className="mb-5 flex gap-2" role="tablist">
          {TABS.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === i
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-elevated text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>}
        {isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            The reports could not be loaded. Check your connection and try again.
          </p>
        )}
        {!isLoading && !isError && reports.length === 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nothing here.</p>
        )}

        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
              <div className="mb-3 flex items-start gap-3">
                <div className="text-2xl" aria-hidden>{ALERT_TYPE_ICONS[r.type]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{r.title}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{r.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {ALERT_TYPE_LABELS[r.type]} · {formatDate(r.createdAt)} · {r.confirmationCount + r.upvoteCount} supporting
                    {' · '}
                    <a
                      className="underline hover:text-slate-700 dark:hover:text-slate-300"
                      href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=19/${r.latitude}/${r.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      map
                    </a>
                  </p>
                </div>
              </div>
              <ReportActions alert={r} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
