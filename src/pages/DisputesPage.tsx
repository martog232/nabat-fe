import { Link } from 'react-router-dom'
import { useDisputedReports } from '../hooks/useRejections'
import { useAuthorityNames } from '../hooks/useAuthorities'
import { useDistrictNames } from '../hooks/useDistricts'

/**
 * The moderators' queue: rejections the reporter disputes, the oldest dispute first.
 *
 * Each opens on the map, where the reason, the dispute and the two answers — uphold or reopen
 * — are on the report itself. The decision belongs there, beside what it decides.
 */
export function DisputesPage() {
  const { data: reports = [], isLoading, isError } = useDisputedReports(true)
  const authorityNames = useAuthorityNames()
  const districtNames = useDistrictNames()

  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT">
      <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Оспорени отхвърляния</h1>
          <p className="text-sm text-slate-600">
            Сигнали, чиито податели не са съгласни с отхвърлянето. Най-старите оспорвания са първи.
          </p>
        </header>

        {isLoading && <p className="text-sm text-slate-600">Зареждане…</p>}
        {isError && <p role="alert" className="text-sm text-red-600">Списъкът не можа да се зареди.</p>}
        {!isLoading && !isError && reports.length === 0 && (
          <p className="text-sm text-slate-600">Няма оспорвания, които чакат решение.</p>
        )}

        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
              <Link to={`/map?alert=${r.id}`} className="font-semibold text-slate-900 hover:underline">
                {r.title}
              </Link>
              <p className="mt-1 text-xs text-slate-500">
                {r.authorityCode ? authorityNames.get(r.authorityCode) ?? r.authorityCode : '—'}
                {r.districtCode && ` · ${districtNames.get(r.districtCode) ?? r.districtCode}`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
