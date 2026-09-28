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
 *
 * The key is built from `queryCenter`, not `mapCenter`: the store rounds and debounces the
 * map's centre so that panning does not spend a request per `moveend`. See its comment for
 * why that belongs there and not here.
 */
export function useNearbyAlerts() {
  const queryCenter = useAlertStore((s) => s.queryCenter)
  const radiusKm = useAlertStore((s) => s.radiusKm)
  const setNearbyTruncation = useAlertStore((s) => s.setNearbyTruncation)

  return useQuery({
    queryKey: ['alerts', 'nearby', queryCenter[0], queryCenter[1], radiusKm],
    queryFn: async () => {
      const response = await alertsApi.getNearby(queryCenter[0], queryCenter[1], radiusKm)
      setNearbyTruncation(response.truncated, response.limit)
      return response.alerts
    },
    // Keeps the previous list on screen while the next centre loads, so a pan does not
    // blank the map and the sidebar between two answers that mostly overlap.
    placeholderData: (previous) => previous,
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

    /*
      Every write below goes through the `['alerts','nearby']` prefix rather than a key
      rebuilt from the store, for the same reason `mergeAlertsIntoCache` does: the key
      the user is subscribed to is not necessarily the one the store describes right
      now. That was already true when the map moved mid-request, and it is now true by
      construction, because the store's query centre trails the map by a debounce — a
      reconstructed key would have addressed an entry nobody was reading.
    */
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['alerts'] })

      const prevAlerts = qc.getQueriesData<Alert[]>({ queryKey: ['alerts', 'nearby'] })

      qc.setQueriesData<Alert[]>({ queryKey: ['alerts', 'nearby'] }, (old) =>
        old?.map((a) =>
          a.id === alertId && a.status === 'ACTIVE'
            ? { ...a, status: 'RESOLVED', resolvedAt: new Date().toISOString() }
            : a,
        ),
      )

      return { prevAlerts }
    },

    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.prevAlerts ?? []) {
        qc.setQueryData(key, data)
      }
      useToastStore.getState().addToast({
        type: 'error',
        message: 'Could not resolve the alert — changes were rolled back.',
      })
    },

    onSuccess: (resolved) => {
      qc.setQueriesData<Alert[]>({ queryKey: ['alerts', 'nearby'] }, (old) =>
        old?.map((a) => (a.id === alertId ? resolved : a)),
      )
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
