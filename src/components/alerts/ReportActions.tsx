import type { Alert } from '../../types'
import { useAuthStore } from '../../store/authStore'
import { useReportAction, useResolveAlert, type ReportAction } from '../../hooks/useAlerts'
import { canAdvanceTo, canRejectAlert, canResolveAlert } from '../../utils/permissions'

interface Props {
  alert: Alert
}

/**
 * Everything the signed-in user may do to move this report along, and nothing they may not.
 *
 * Which buttons appear mirrors the server's rules: acknowledging and starting work are the
 * report's own district's; rejecting is the district's or a moderator's; marking fixed is
 * open to the district, the reporter, or a moderator. The server re-checks all of it — an
 * official of another district sees nothing here, and would be refused if they tried.
 */
export function ReportActions({ alert }: Props) {
  const user = useAuthStore((s) => s.user)
  const action = useReportAction(alert.id)
  const resolve = useResolveAlert(alert.id)

  const buttons: { key: ReportAction | 'resolve'; label: string; show: boolean; tone: 'primary' | 'plain' | 'danger' }[] = [
    { key: 'acknowledge', label: 'Приеми', show: canAdvanceTo(user, alert, 'ACKNOWLEDGED'), tone: 'plain' },
    { key: 'startWork', label: 'Започни работа', show: canAdvanceTo(user, alert, 'IN_PROGRESS'), tone: 'plain' },
    { key: 'resolve', label: 'Маркирай като решен', show: canResolveAlert(user, alert), tone: 'primary' },
    { key: 'reject', label: 'Отхвърли', show: canRejectAlert(user, alert), tone: 'danger' },
  ]
  const visible = buttons.filter((b) => b.show)
  if (visible.length === 0) return null

  const busy = action.isPending || resolve.isPending
  const pendingKey = resolve.isPending ? 'resolve' : action.isPending ? action.variables : undefined

  const run = (key: ReportAction | 'resolve') => {
    if (busy) return
    if (key === 'resolve') resolve.mutate()
    else action.mutate(key)
  }

  const toneClass = {
    primary: 'border-brand-500/40 bg-brand-500/10 text-brand-400 hover:border-brand-500/70 hover:bg-brand-500/15',
    plain: 'border-surface-border bg-surface-elevated text-slate-700 hover:bg-surface-hover',
    danger: 'border-rose-500/30 bg-rose-500/5 text-rose-500 hover:border-rose-500/60',
  }

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Действия по сигнала">
      {visible.map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={() => run(b.key)}
          disabled={busy}
          className={`rounded-xl border py-3 sm:py-2 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${toneClass[b.tone]}`}
        >
          {pendingKey === b.key ? '…' : b.label}
        </button>
      ))}
    </div>
  )
}
