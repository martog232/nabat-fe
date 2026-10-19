import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../api/alerts'
import { errorCodeOf } from '../api/errors'
import { useToastStore } from '../store/toastStore'

const forwardsKey = (alertId: string) => ['forwards', alertId] as const

/** Where a report has been forwarded, oldest first. Needs a session, like the report itself. */
export function useForwards(alertId: string, enabled: boolean) {
  return useQuery({
    queryKey: forwardsKey(alertId),
    queryFn: () => alertsApi.forwards(alertId),
    enabled,
  })
}

/**
 * Hands a report to another authority. Not optimistic: the server decides whether this
 * official may, and the report changes authority and status, which every list shows.
 */
export function useForwardReport(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ authorityCode, reason }: { authorityCode: string; reason: string }) =>
      alertsApi.forward(alertId, authorityCode, reason),

    onSuccess: () => {
      useToastStore.getState().addToast({ type: 'success', message: 'Сигналът е препратен.' })
    },

    onError: (err) => {
      const code = errorCodeOf(err)
      useToastStore.getState().addToast({
        type: 'error',
        message: code === 'FORBIDDEN'
          ? 'Не можете да препратите този сигнал. След три препращания решава модератор.'
          : code === 'CONFLICT' || code === 'CONCURRENT_UPDATE'
            ? 'Сигналът е променен, откакто го отворихте.'
            : 'Сигналът не можа да бъде препратен. Опитайте отново.',
      })
    },

    // The report, the lists it is in, its thread (the forward is written there) and its chain.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['comments', alertId] })
      qc.invalidateQueries({ queryKey: forwardsKey(alertId) })
    },
  })
}
