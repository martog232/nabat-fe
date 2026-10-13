import { useAuthStore } from '../../store/authStore'
import { useAnswerFixCheck, useFixCheck } from '../../hooks/useFixCheck'
import { actsForDistrictOf } from '../../utils/permissions'
import type { Alert, FixCheckSummary, FixVerdict } from '../../types'
import { FIX_OUTCOME_COLORS, FIX_OUTCOME_LABELS, FIX_VERDICT_LABELS, UNCHECKED_FIX } from '../../types'

const VERDICTS: { verdict: FixVerdict; emoji: string }[] = [
  { verdict: 'FIXED', emoji: '✅' },
  { verdict: 'PARTLY', emoji: '🟡' },
  { verdict: 'NOT_FIXED', emoji: '❌' },
]

function tallyLine(s: FixCheckSummary): string {
  if (s.fixed + s.partly + s.notFixed === 0) return 'Още никой не е казал.'
  return `${s.fixed} казват оправено · ${s.partly} частично · ${s.notFixed} не`
}

/**
 * "Is it really fixed?" — asked of everyone about a report closed as resolved.
 *
 * A district marking its own work done is a claim, and this is where it is checked. Anyone
 * signed in may answer, except an official of the report's own district: the server refuses
 * them, so the buttons are not offered. Clicking the answer you already gave takes it back.
 * Renders nothing for a report that is not resolved.
 */
export function FixCheckPanel({ alert }: { alert: Alert }) {
  const user = useAuthStore((s) => s.user)
  const ownDistrict = actsForDistrictOf(user, alert)
  const canAnswer = !!user && !ownDistrict
  const isResolved = alert.status === 'RESOLVED'

  const { data } = useFixCheck(alert.id, isResolved && canAnswer)
  const answer = useAnswerFixCheck(alert.id)

  if (!isResolved) return null

  const summary = data?.summary ?? alert.fixCheck ?? UNCHECKED_FIX
  const mine = data?.mine ?? null
  const isReporter = !!user && user.id === alert.reportedBy

  const choose = (verdict: FixVerdict) => {
    if (!canAnswer || answer.isPending) return
    answer.mutate(mine === verdict ? null : verdict)
  }

  return (
    <section aria-labelledby={`fix-check-${alert.id}`} className="space-y-2 rounded-xl border border-surface-border bg-surface-elevated p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={`fix-check-${alert.id}`} className="text-sm font-semibold text-slate-900">
          Наистина ли е оправено?
        </h4>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${FIX_OUTCOME_COLORS[summary.outcome]}`}
        >
          {FIX_OUTCOME_LABELS[summary.outcome]}
        </span>
      </div>

      {canAnswer && (
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Вашият отговор">
          {VERDICTS.map(({ verdict, emoji }) => {
            const active = mine === verdict
            return (
              <button
                key={verdict}
                type="button"
                aria-pressed={active}
                disabled={answer.isPending}
                onClick={() => choose(verdict)}
                className={`flex flex-col items-center rounded-lg border px-1 py-2 text-xs transition-colors disabled:opacity-60 ${
                  active
                    ? 'border-brand-500/60 bg-brand-500/10 font-semibold text-slate-900'
                    : 'border-surface-border bg-surface-card text-slate-700 hover:border-brand-500/30'
                }`}
              >
                <span aria-hidden>{emoji}</span>
                {FIX_VERDICT_LABELS[verdict]}
              </button>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-600">{tallyLine(summary)}</p>

      {summary.reporterVerdict && (
        <p className="text-xs text-slate-600">
          Подателят казва: <span className="font-semibold">{FIX_VERDICT_LABELS[summary.reporterVerdict]}</span>
        </p>
      )}
      {canAnswer && isReporter && (
        <p className="text-xs text-slate-500">Вие подадохте сигнала — вашият отговор тежи най-много.</p>
      )}
      {ownDistrict && (
        <p className="text-xs text-slate-500">Районът не може да проверява собствената си работа.</p>
      )}
      {!user && (
        <p className="text-xs text-slate-500">
          <a href="/login" className="text-brand-400 hover:underline">Влезте</a>, за да кажете дали е оправено.
        </p>
      )}
    </section>
  )
}
