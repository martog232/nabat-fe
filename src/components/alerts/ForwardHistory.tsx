import type { Alert } from '../../types'
import { useAuthorityNames } from '../../hooks/useAuthorities'
import { useForwards } from '../../hooks/useForwards'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
}

/**
 * Where the report has been: "Район Лозенец → Софийска вода → ...". Shown because the chain
 * is the record — a report passed between authorities for weeks is exactly what "forwarded
 * by competence" hides elsewhere. Nothing at all for a report that never moved.
 */
export function ForwardHistory({ alert }: { alert: Alert }) {
  const names = useAuthorityNames()
  const { data: forwards = [] } = useForwards(alert.id, true)
  if (forwards.length === 0) return null

  const name = (code: string) => names.get(code) ?? code

  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated/50 p-3 text-xs text-slate-600">
      <p className="mb-1 font-semibold text-slate-700">Препращания</p>
      <ol className="space-y-1">
        {forwards.map((f) => (
          <li key={f.sequence}>
            <span className="font-medium text-slate-800">{name(f.fromAuthority)} → {name(f.toAuthority)}</span>
            {' · '}{formatDate(f.forwardedAt)}
            {f.byModerator && ' · от модератор'}
            <span className="block text-slate-500">{f.reason}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
