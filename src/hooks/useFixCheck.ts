import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fixChecksApi } from '../api/fixChecks'
import { errorCodeOf } from '../api/errors'
import { useToastStore } from '../store/toastStore'
import type { Alert, FixCheckResponse, FixCheckSummary, FixVerdict, RankedReportsResponse } from '../types'

const fixCheckKey = (alertId: string) => ['fix-check', alertId] as const

const COUNTER: Record<FixVerdict, 'fixed' | 'partly' | 'notFixed'> = {
  FIXED: 'fixed',
  PARTLY: 'partly',
  NOT_FIXED: 'notFixed',
}

/**
 * Moves the caller's answer from `from` to `to` in the counts. The outcome is left as it was:
 * the server owns the rule, and its answer replaces this a moment later — the same choice
 * useVotes makes about the credibility score.
 */
function applyAnswerChange(summary: FixCheckSummary, from: FixVerdict | null, to: FixVerdict | null): FixCheckSummary {
  const next = { ...summary }
  if (from) next[COUNTER[from]] = Math.max(0, next[COUNTER[from]] - 1)
  if (to) next[COUNTER[to]] += 1
  return next
}

/**
 * Writes the server's tally onto every cached copy of the report — the map, the district's
 * list, the public list and a report opened on its own — so a badge never disagrees with the
 * panel next to it.
 */
function applySummaryToAlerts(qc: ReturnType<typeof useQueryClient>, alertId: string, summary: FixCheckSummary) {
  const patch = (a: Alert) => (a.id === alertId ? { ...a, fixCheck: summary } : a)
  qc.setQueriesData<Alert[]>({ queryKey: ['alerts', 'nearby'] }, (old) => old?.map(patch))
  qc.setQueriesData<Alert[]>({ queryKey: ['alerts', 'district'] }, (old) => old?.map(patch))
  qc.setQueriesData<RankedReportsResponse>({ queryKey: ['alerts', 'ranked'] }, (old) =>
    old ? { ...old, alerts: old.alerts.map(patch) } : old,
  )
  qc.setQueriesData<Alert>({ queryKey: ['alerts', 'one', alertId] }, (old) => (old ? patch(old) : old))
}

function failureMessage(err: unknown): string {
  switch (errorCodeOf(err)) {
    case 'CONFLICT':
      return 'Сигналът вече не е отбелязан като решен — няма какво да се проверява.'
    case 'FORBIDDEN':
      return 'Районът не може да проверява собствената си работа.'
    default:
      return 'Отговорът ви не беше записан — промяната е отменена. Опитайте отново.'
  }
}

/** The tally and the caller's own answer. Asked only where an answer can be given. */
export function useFixCheck(alertId: string, enabled: boolean) {
  return useQuery({
    queryKey: fixCheckKey(alertId),
    queryFn: () => fixChecksApi.get(alertId),
    enabled: enabled && !!alertId,
  })
}

/**
 * Sets the caller's answer, or takes it back with `null`. Optimistic, rolled back on failure;
 * on success the server's tally goes everywhere the report is cached.
 */
export function useAnswerFixCheck(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (verdict: FixVerdict | null) =>
      verdict ? fixChecksApi.check(alertId, verdict) : fixChecksApi.withdraw(alertId),

    onMutate: async (verdict: FixVerdict | null) => {
      await qc.cancelQueries({ queryKey: fixCheckKey(alertId) })
      const prev = qc.getQueryData<FixCheckResponse>(fixCheckKey(alertId))
      if (prev) {
        qc.setQueryData<FixCheckResponse>(fixCheckKey(alertId), {
          summary: applyAnswerChange(prev.summary, prev.mine, verdict),
          mine: verdict,
        })
      }
      return { prev }
    },

    onSuccess: (response) => {
      qc.setQueryData(fixCheckKey(alertId), response)
      applySummaryToAlerts(qc, alertId, response.summary)
    },

    onError: (err, _verdict, context) => {
      if (context?.prev) qc.setQueryData(fixCheckKey(alertId), context.prev)
      qc.invalidateQueries({ queryKey: fixCheckKey(alertId) })
      useToastStore.getState().addToast({ type: 'error', message: failureMessage(err) })
    },
  })
}
