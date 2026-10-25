import { useState } from 'react'
import type { Alert } from '../../types'
import { useAuthorities } from '../../hooks/useAuthorities'
import { useForwardReport } from '../../hooks/useForwards'

/** As long as the server takes; a longer one is refused there, so it is stopped here. */
const REASON_MAX = 1000

/**
 * "Not ours — it is X's": the report goes to another authority, with the reason said in its
 * thread and at the top of the mail to the new one. The reason is required, because a forward
 * without one only passes the problem on.
 */
export function ForwardForm({ alert, onDone }: { alert: Alert; onDone: () => void }) {
  const { data: authorities = [] } = useAuthorities()
  const forward = useForwardReport(alert.id)
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')

  const choices = authorities.filter((a) => a.code !== alert.authorityCode)
  const ready = to !== '' && reason.trim().length > 0 && !forward.isPending

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    forward.mutate({ authorityCode: to, reason: reason.trim() }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-surface-border bg-surface-elevated p-3">
      <label className="block text-xs font-semibold text-slate-700" htmlFor={`forward-to-${alert.id}`}>
        Към кого
      </label>
      <select
        id={`forward-to-${alert.id}`}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-slate-800"
      >
        <option value="" disabled>Изберете район или институция…</option>
        <optgroup label="Институции">
          {choices.filter((a) => a.kind === 'INSTITUTION').map((a) => (
            <option key={a.code} value={a.code}>{a.name}</option>
          ))}
        </optgroup>
        <optgroup label="Райони">
          {choices.filter((a) => a.kind === 'DISTRICT').map((a) => (
            <option key={a.code} value={a.code}>{a.name}</option>
          ))}
        </optgroup>
      </select>

      <label className="block text-xs font-semibold text-slate-700" htmlFor={`forward-why-${alert.id}`}>
        Защо е тяхно
      </label>
      <textarea
        id={`forward-why-${alert.id}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={REASON_MAX}
        rows={2}
        placeholder="Напр. шахтата е на водопровода"
        className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-slate-800"
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Отказ
        </button>
        <button
          type="submit"
          disabled={!ready}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {forward.isPending ? '…' : 'Препрати'}
        </button>
      </div>
    </form>
  )
}
