import { useState } from 'react'
import type { Alert } from '../../types'
import { useAuthStore } from '../../store/authStore'
import { useAuthorityNames } from '../../hooks/useAuthorities'
import { useDecideDispute, useDisputeRejection, useRejections } from '../../hooks/useRejections'
import { canModerateContent } from '../../utils/permissions'
import { ReasonForm } from './ReasonForm'

/**
 * Why a rejected report was rejected, and the way to contest it.
 *
 * The reporter may dispute it once, saying why; a moderator then upholds it or reopens the
 * report. Shown only on a rejected report — a reopened one is open, and its thread says what
 * happened. A report rejected before reasons were kept shows nothing: there is nothing on
 * record to show or to dispute.
 */
export function RejectionPanel({ alert }: { alert: Alert }) {
  const user = useAuthStore((s) => s.user)
  const names = useAuthorityNames()
  const rejected = alert.status === 'REJECTED'
  const { data: rejections = [] } = useRejections(alert.id, rejected)
  const dispute = useDisputeRejection(alert.id)
  const decide = useDecideDispute(alert.id)
  const [disputing, setDisputing] = useState(false)

  const latest = rejections.at(-1)
  if (!rejected || !latest) return null

  const isReporter = user?.id === alert.reportedBy
  const awaiting = latest.disputedAt !== null && latest.decision === null
  const by = latest.byModerator ? 'модератор' : names.get(latest.authorityCode) ?? latest.authorityCode

  return (
    <div className="space-y-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm">
      <p className="text-slate-800">
        <span className="font-semibold">Отхвърлен от {by}:</span> {latest.reason}
      </p>

      {latest.disputeReason && (
        <p className="text-slate-700">
          <span className="font-semibold">Оспорено от подателя:</span> {latest.disputeReason}
        </p>
      )}
      {awaiting && <p className="text-xs text-slate-500">Оспорването чака решение на модератор.</p>}
      {latest.decision === 'UPHELD' && (
        <p className="text-xs text-slate-500">Модератор прегледа оспорването и потвърди отхвърлянето.</p>
      )}

      {isReporter && latest.disputedAt === null && !disputing && (
        <button
          type="button"
          onClick={() => setDisputing(true)}
          className="w-full rounded-xl border border-surface-border bg-surface-card py-2 text-sm font-semibold text-slate-700 hover:bg-surface-hover"
        >
          Оспори отхвърлянето
        </button>
      )}
      {disputing && (
        <ReasonForm
          label="Защо не сте съгласни"
          placeholder="Напр. дупката още е там, не е дубликат"
          submitLabel="Оспори"
          pending={dispute.isPending}
          onSubmit={(reason) => dispute.mutate(reason, { onSuccess: () => setDisputing(false) })}
          onCancel={() => setDisputing(false)}
        />
      )}

      {awaiting && canModerateContent(user?.role) && (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Решение по оспорването">
          <button
            type="button"
            disabled={decide.isPending}
            onClick={() => decide.mutate('UPHELD')}
            className="rounded-xl border border-surface-border bg-surface-card py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Потвърди отхвърлянето
          </button>
          <button
            type="button"
            disabled={decide.isPending}
            onClick={() => decide.mutate('REOPENED')}
            className="rounded-xl border border-brand-500/40 bg-brand-500/10 py-2 text-sm font-semibold text-brand-500 disabled:opacity-60"
          >
            Отвори отново
          </button>
        </div>
      )}
    </div>
  )
}
