import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../api/alerts'
import { errorCodeOf } from '../api/errors'
import { useToastStore } from '../store/toastStore'
import type { RejectionDecision } from '../types'

const rejectionsKey = (alertId: string) => ['rejections', alertId] as const
const DISPUTED_KEY = ['alerts', 'disputed'] as const

/** Every rejection of a report, oldest first. Only worth asking about a rejected one. */
export function useRejections(alertId: string, enabled: boolean) {
  return useQuery({
    queryKey: rejectionsKey(alertId),
    queryFn: () => alertsApi.rejections(alertId),
    enabled,
  })
}

/** The moderators' queue: reports whose rejection the reporter disputes. */
export function useDisputedReports(enabled: boolean) {
  return useQuery({
    queryKey: DISPUTED_KEY,
    queryFn: alertsApi.listDisputed,
    enabled,
  })
}

/**
 * Each step changes the report, its thread (every step is written there) and its rejections,
 * and the queue, so all four are refetched rather than patched by hand.
 */
function useRejectionStep<T>(alertId: string, call: (arg: T) => Promise<unknown>, done: string, failed: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: call,
    onSuccess: () => useToastStore.getState().addToast({ type: 'success', message: done }),
    onError: (err) => {
      const code = errorCodeOf(err)
      useToastStore.getState().addToast({
        type: 'error',
        message: code === 'CONFLICT' || code === 'CONCURRENT_UPDATE'
          ? 'Сигналът е променен, откакто го отворихте.'
          : failed,
      })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['comments', alertId] })
      qc.invalidateQueries({ queryKey: rejectionsKey(alertId) })
    },
  })
}

/** Closes the report without a fix, saying why. */
export function useRejectReport(alertId: string) {
  return useRejectionStep(alertId, (reason: string) => alertsApi.reject(alertId, reason),
    'Сигналът е отхвърлен.', 'Сигналът не можа да бъде отхвърлен. Опитайте отново.')
}

/** The reporter contests the rejection, once. */
export function useDisputeRejection(alertId: string) {
  return useRejectionStep(alertId, (reason: string) => alertsApi.disputeRejection(alertId, reason),
    'Оспорването е изпратено. Модератор ще го прегледа.', 'Оспорването не можа да бъде изпратено.')
}

/** A moderator answers a dispute. */
export function useDecideDispute(alertId: string) {
  return useRejectionStep(alertId, (decision: RejectionDecision) => alertsApi.decideDispute(alertId, decision),
    'Решението е записано.', 'Решението не можа да бъде записано.')
}
