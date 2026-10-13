import type { AxiosError } from 'axios'
import { useSimilarReports } from '../../hooks/useSimilarReports'
import { useVote } from '../../hooks/useVotes'
import { useCategoryIndex } from '../../hooks/useCategories'
import { resolveCategory } from '../../utils/categories'
import { useAlertStore } from '../../store/alertStore'
import { useToastStore } from '../../store/toastStore'
import { STATUS_LABELS } from '../../types'
import type { ErrorResponse, SimilarCallSofiaReport, SimilarReport } from '../../types'

interface Props {
  latitude: number
  longitude: number
  categoryCode: number | null
  /** Closes the report form — after the person confirmed an existing report instead. */
  onResolved: () => void
  /** „Моят е различен“: hide the advice, keep filing. */
  onDismiss: () => void
}

function ageInDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'днес'
  return `преди ${days} ${days === 1 ? 'ден' : 'дни'}`
}

function signals(n: number): string {
  return n === 1 ? '1 сигнал' : `${n} сигнала`
}

/**
 * "Може би вече е подаден?" — the reports that might be the same problem, shown in the
 * report form once it has a place and a category.
 *
 * Advice, never a gate: submitting stays possible whatever is here, and if the check fails
 * the panel simply does not appear. A nabat match can be confirmed in one tap, which turns
 * a duplicate report into weight on the existing one. A Call Sofia match can only be
 * opened there — nabat cannot vote on it.
 */
export function SimilarReportsPanel({ latitude, longitude, categoryCode, onResolved, onDismiss }: Props) {
  const { data, isLoading, isError } = useSimilarReports(latitude, longitude, categoryCode)

  if (categoryCode == null || isError) return null
  if (isLoading) {
    return <p className="text-xs text-slate-500">Проверяваме за подобни сигнали…</p>
  }
  if (!data) return null

  const total = data.reports.length + data.callSofia.length
  if (total === 0) return null

  return (
    <section
      aria-labelledby="similar-title"
      className="rounded-xl border border-amber-400/50 bg-amber-50 p-3 space-y-3"
    >
      <div>
        <h3 id="similar-title" className="text-sm font-semibold text-slate-900">
          Може би вече е подаден?
        </h3>
        <p className="text-xs text-slate-600">
          Наблизо (до {data.radiusMeters} м) има {signals(total)} от същата група.
        </p>
      </div>

      <ul className="space-y-2">
        {data.reports.map((match) => (
          <NabatMatch key={match.report.id} match={match} onResolved={onResolved} />
        ))}
        {data.callSofia.map((match) => (
          <CallSofiaMatch key={match.id} match={match} />
        ))}
      </ul>

      <button
        type="button"
        onClick={onDismiss}
        className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-slate-700 hover:bg-surface-hover transition-colors"
      >
        Моят е различен — продължи
      </button>
    </section>
  )
}

function NabatMatch({ match, onResolved }: { match: SimilarReport; onResolved: () => void }) {
  const { report, meters } = match
  const index = useCategoryIndex()
  const resolved = resolveCategory(index, report.categoryCode)
  const vote = useVote(report.id)
  const selectAlert = useAlertStore((s) => s.selectAlert)

  const done = () => {
    selectAlert(report.id)
    onResolved()
  }

  const confirm = () =>
    vote.mutate('CONFIRM', {
      onSuccess: () => {
        useToastStore.getState().addToast({ type: 'success', message: 'Потвърдихте съществуващ сигнал — благодарим!' })
        done()
      },
      onError: (err) => {
        // Already confirmed by this person: the outcome they wanted is already true.
        // Every other failure is toasted by useVote, and the form stays open.
        if ((err as AxiosError<ErrorResponse>).response?.data?.code === 'VOTE_ALREADY_CAST') done()
      },
    })

  return (
    <li className="rounded-lg border border-surface-border bg-surface-card p-3 space-y-2">
      <div>
        <p className="text-xs text-slate-500">
          {resolved?.category.name ?? 'Сигнал'} · на {meters} м · {STATUS_LABELS[report.status]}
        </p>
        <p className="text-sm font-medium text-slate-900">{report.title}</p>
        <p className="text-xs text-slate-500">
          подаден {ageInDays(report.createdAt)} · потвърждения: {report.confirmationCount}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={vote.isPending}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          И аз го виждам — потвърждавам
        </button>
        <button
          type="button"
          onClick={done}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-surface-hover transition-colors"
        >
          Виж на картата
        </button>
      </div>
    </li>
  )
}

function CallSofiaMatch({ match }: { match: SimilarCallSofiaReport }) {
  return (
    <li className="rounded-lg border border-surface-border bg-surface-card p-3 space-y-1">
      <p className="text-xs text-slate-500">
        <span className="mr-1 rounded bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-800">В Call Sofia</span>
        на {match.meters} м · подаден {ageInDays(match.submittedAt)}
      </p>
      <p className="text-sm font-medium text-slate-900">{match.title}</p>
      {match.registryNumber && <p className="text-xs text-slate-500">{match.registryNumber}</p>}
      <a
        href={match.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs font-medium text-sky-700 hover:underline"
      >
        Отвори в Call Sofia ↗
      </a>
    </li>
  )
}
