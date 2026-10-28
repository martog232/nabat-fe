import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Alert, ReportStep } from '../../types'
import { alertsApi } from '../../api/alerts'
import { useAuthorityNames } from '../../hooks/useAuthorities'

const STEP_LABELS: Record<ReportStep['step'], string> = {
  CREATED: 'Подаден',
  SENT: 'Изпратен до',
  ACKNOWLEDGED: 'Приет',
  WORK_STARTED: 'Започната работа',
  RESOLVED: 'Отбелязан като решен',
  REJECTED: 'Отхвърлен',
  FORWARDED: 'Препратен',
  REOPENED: 'Отворен отново',
  WITHDRAWN: 'Оттеглен',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('bg-BG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Who did what to the report, and when — the person, not just "the district". Folded away
 * until asked for: it is the record behind the status, not something everyone needs to read.
 * Reports older than the history have none, and show nothing.
 */
export function ReportTimeline({ alert }: { alert: Alert }) {
  const names = useAuthorityNames()
  const [open, setOpen] = useState(false)
  const { data: steps = [] } = useQuery({
    queryKey: ['history', alert.id, alert.status],
    queryFn: () => alertsApi.history(alert.id),
    enabled: open,
  })

  const authority = (code: string | null) => (code ? names.get(code) ?? code : '')

  return (
    <div className="text-xs">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="font-medium text-slate-600 hover:underline">
        {open ? 'Скрий историята' : 'История на сигнала'}
      </button>
      {open && (
        <ol className="mt-2 space-y-1 border-l border-surface-border pl-3 text-slate-600">
          {steps.length === 0 && <li className="text-slate-500">Няма записана история.</li>}
          {steps.map((s, i) => (
            <li key={i}>
              <span className="text-slate-500">{formatDate(s.happenedAt)}</span>
              {' · '}
              <span className="font-medium text-slate-800">
                {STEP_LABELS[s.step]}{s.step === 'SENT' ? ` ${authority(s.authorityCode)}` : ''}
              </span>
              {s.actorName && (
                <> от {s.actorName}{s.byAuthority ? ` (${authority(s.authorityCode)})` : ''}</>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
