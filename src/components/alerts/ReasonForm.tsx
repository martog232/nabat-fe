import { useId, useState } from 'react'

/** As long as the server takes; a longer one is refused there, so it is stopped here. */
const REASON_MAX = 1000

interface Props {
  label: string
  placeholder: string
  submitLabel: string
  pending: boolean
  onSubmit: (reason: string) => void
  onCancel: () => void
  tone?: 'primary' | 'danger'
}

/**
 * A step that has to say why — rejecting a report, disputing a rejection. The submit stays
 * disabled until there is a reason: the server refuses an empty one, and a step this heavy
 * should not be one click.
 */
export function ReasonForm({ label, placeholder, submitLabel, pending, onSubmit, onCancel, tone = 'primary' }: Props) {
  const id = useId()
  const [reason, setReason] = useState('')
  const ready = reason.trim().length > 0 && !pending

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (ready) onSubmit(reason.trim())
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-surface-border bg-surface-elevated p-3">
      <label className="block text-xs font-semibold text-slate-700" htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={REASON_MAX}
        rows={2}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-slate-800"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          Отказ
        </button>
        <button
          type="submit"
          disabled={!ready}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${tone === 'danger' ? 'bg-rose-600' : 'bg-brand-600'}`}
        >
          {pending ? '…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
