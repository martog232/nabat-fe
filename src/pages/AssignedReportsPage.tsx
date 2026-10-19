import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAssignedReports } from '../hooks/useAlerts'
import { useDistrictNames } from '../hooks/useDistricts'
import { useAuthorityNames } from '../hooks/useAuthorities'
import { useAuthStore } from '../store/authStore'
import { ReportActions } from '../components/alerts/ReportActions'
import { StatusBadge } from '../components/common/Badge'
import { FixOutcomeBadge } from '../components/alerts/FixOutcomeBadge'
import { OverdueBadge } from '../components/alerts/OverdueBadge'
import type { AlertStatus } from '../types'
import { OPEN_STATUSES } from '../types'
import { GroupIcon } from '../components/common/GroupIcon'
import { useCategoryIndex } from '../hooks/useCategories'
import { resolveCategory } from '../utils/categories'

/** The three piles an official works through. "Open" is everything still waiting on them. */
const TABS: { label: string; statuses: AlertStatus[] }[] = [
  { label: 'Отворени', statuses: [...OPEN_STATUSES] },
  { label: 'Решени', statuses: ['RESOLVED'] },
  { label: 'Отхвърлени', statuses: ['REJECTED'] },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('bg-BG', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * An official's working list: every report their authority answers for, newest first, with
 * what they may do to each right beside it. For a district that is its own territory; for an
 * institution it is the whole city, so each report says which district it is in.
 *
 * The authority is the account's, and the server takes it from there — this page never names
 * one in a request, so there is no way to point it at somebody else's.
 */
export function AssignedReportsPage() {
  const user = useAuthStore((s) => s.user)
  const districtNames = useDistrictNames()
  const authorityNames = useAuthorityNames()
  const categoryIndex = useCategoryIndex()
  const [tab, setTab] = useState(0)
  const { data: reports = [], isLoading, isError } = useAssignedReports(TABS[tab].statuses)

  const authorityName = user?.authorityCode ? authorityNames.get(user.authorityCode) ?? user.authorityCode : ''

  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT">
      <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <header className="mb-6 flex items-center gap-3">
          <Link
            to="/map"
            aria-label="Обратно към картата"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-card text-slate-600 transition-colors hover:bg-surface-hover"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{authorityName}</h1>
            <p className="text-sm text-slate-600">Сигнали, изпратени до вас</p>
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
                  : 'bg-surface-elevated text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-slate-600">Зареждане…</p>}
        {isError && (
          <p role="alert" className="text-sm text-red-600">
            Сигналите не можаха да се заредят. Проверете връзката си и опитайте отново.
          </p>
        )}
        {!isLoading && !isError && reports.length === 0 && (
          <p className="text-sm text-slate-600">Няма сигнали.</p>
        )}

        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
              <div className="mb-3 flex items-start gap-3">
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
                  <p className="mt-1 text-sm text-slate-700">{r.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {resolveCategory(categoryIndex, r.categoryCode)?.category.name ?? '—'} · {r.districtCode ? `${districtNames.get(r.districtCode) ?? r.districtCode} · ` : ''}{formatDate(r.createdAt)} · подкрепа: {Math.max(0, r.confirmationCount + r.upvoteCount - r.downvoteCount)}
                    {' · '}
                    <a
                      className="underline hover:text-slate-700"
                      href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=19/${r.latitude}/${r.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      карта
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
