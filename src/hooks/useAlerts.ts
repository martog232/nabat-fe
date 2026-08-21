import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../api/alerts'
import { useAlertStore } from '../store/alertStore'
import { useToastStore } from '../store/toastStore'
import type { Alert, CreateAlertRequest } from '../types'

/**
 * The cached value stays an `Alert[]`, even though the endpoint answers an envelope.
 *
 * That array is the live set: the WebSocket upserts into it, `useResolveAlert` patches it
 * optimistically, and the reconnect catch-up merges into it. Making the envelope the cache
 * shape would mean rewriting all of that for one boolean.
 *
 * The boolean goes to the store instead of a sibling cache key, because the WebSocket merge
 * uses `setQueriesData` with the *prefix* `['alerts', 'nearby']` — anything cached under that
 * prefix gets run through a merge function that expects a list of alerts.
 *
 * It also belongs to the fetch rather than to the live set: once the socket has pushed a few
 * alerts in, `count` is no longer what the server said, while "your first page was capped"
 * stays true and is still the thing worth telling the user.
 */
export function useNearbyAlerts() {
  const mapCenter = useAlertStore((s) => s.mapCenter)
  const radiusKm = useAlertStore((s) => s.radiusKm)
  const setNearbyTruncation = useAlertStore((s) => s.setNearbyTruncation)

  return useQuery({
    queryKey: ['alerts', 'nearby', mapCenter, radiusKm],
    queryFn: async () => {
      const response = await alertsApi.getNearby(mapCenter[0], mapCenter[1], radiusKm)
      setNearbyTruncation(response.truncated, response.limit)
      return response.alerts
    },
  })
}

export function useCreateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAlertRequest) => alertsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

export function useResolveAlert(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => alertsApi.resolve(alertId),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['alerts'] })

      const { mapCenter, radiusKm, selectedAlertId: prevSelectedId } = useAlertStore.getState()
      const key = ['alerts', 'nearby', mapCenter, radiusKm]
      const prevAlerts = qc.getQueryData<Alert[]>(key)

      qc.setQueryData<Alert[]>(key, (old) =>
        old?.map((a) =>
          a.id === alertId && a.status === 'ACTIVE'
            ? { ...a, status: 'RESOLVED', resolvedAt: new Date().toISOString() }
            : a,
        ),
      )

      return { prevAlerts, prevSelectedId, key }
    },

    onError: (_err, _vars, context) => {
      if (context?.prevAlerts) {
        qc.setQueryData(context.key, context.prevAlerts)
      }
      useToastStore.getState().addToast({
        type: 'error',
        message: 'Could not resolve the alert — changes were rolled back.',
      })
    },

    onSuccess: (resolved) => {
      const { mapCenter, radiusKm } = useAlertStore.getState()
      const key = ['alerts', 'nearby', mapCenter, radiusKm]
      qc.setQueryData<Alert[]>(key, (old) =>
        old?.map((a) => (a.id === alertId ? resolved : a)),
      )
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}


