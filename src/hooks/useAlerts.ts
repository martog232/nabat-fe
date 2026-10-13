import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../api/alerts'
import { useAlertStore } from '../store/alertStore'
import { useToastStore } from '../store/toastStore'
import { errorCodeOf } from '../api/errors'
import type { Alert, AlertStatus, CreateAlertRequest, ReportRanking } from '../types'
import { isOpen } from '../types'

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
  const categoryFilter = useAlertStore((s) => s.categoryFilter)
  const setNearbyTruncation = useAlertStore((s) => s.setNearbyTruncation)

  return useQuery({
    // The category is the last element, and useAlertWebSocket reads it from there to keep
    // a filtered list filtered when a new report arrives. Keep it last.
    queryKey: ['alerts', 'nearby', queryCenter[0], queryCenter[1], radiusKm, categoryFilter],
    queryFn: async () => {
      const response = await alertsApi.getNearby(queryCenter[0], queryCenter[1], radiusKm, categoryFilter)
      setNearbyTruncation(response.truncated, response.limit)
      return response.alerts
    },
    // Keeps the previous list on screen while the next centre loads, so a pan does not
    // blank the map and the sidebar between two answers that mostly overlap.
    placeholderData: (previous) => previous,
  })
}

/**
 * One report by id, for when it is not on the map — a resolved report opened from its
 * notification, say. The map's list holds open reports only, so without this the detail card
 * of a resolved report would have nothing to show. Asked only when `enabled`.
 */
export function useAlert(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['alerts', 'one', id],
    queryFn: () => alertsApi.getById(id as string),
    enabled: enabled && !!id,
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
          a.id === alertId && isOpen(a.status)
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
        message: 'Сигналът не можа да бъде отбелязан като решен — промяната е отменена.',
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

/** What a district can say about one of its reports, besides "fixed". */
export type ReportAction = 'acknowledge' | 'startWork' | 'reject'

const ACTION_CALLS: Record<ReportAction, (id: string) => Promise<Alert>> = {
  acknowledge: alertsApi.acknowledge,
  startWork: alertsApi.startWork,
  reject: alertsApi.reject,
}

/**
 * Moves a report on, as its district or a moderator.
 *
 * Not optimistic, unlike resolving your own report: these are statements by the body
 * responsible, the server decides whether they are allowed, and a 409 is a real answer —
 * the report may have moved on since the list was loaded. What the server returns replaces
 * the report wherever it is cached, on the map and in the district list alike.
 */
export function useReportAction(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (action: ReportAction) => ACTION_CALLS[action](alertId),

    onSuccess: (updated) => {
      qc.setQueriesData<Alert[]>({ queryKey: ['alerts', 'nearby'] }, (old) =>
        old?.map((a) => (a.id === updated.id ? updated : a)),
      )
      qc.setQueriesData<Alert[]>({ queryKey: ['alerts', 'district'] }, (old) =>
        old?.map((a) => (a.id === updated.id ? updated : a)),
      )
    },

    onError: (err) => {
      const code = errorCodeOf(err)
      useToastStore.getState().addToast({
        type: 'error',
        message: code === 'CONFLICT' || code === 'CONCURRENT_UPDATE'
          ? 'Сигналът е променен, откакто го отворихте. Списъкът е обновен.'
          : 'Сигналът не можа да бъде обновен. Опитайте отново.',
      })
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

/**
 * A district official's working list — their own district, the open reports unless
 * `statuses` says otherwise. The district is not a parameter: the server takes it from the
 * account.
 */
export function useDistrictReports(statuses: AlertStatus[] = []) {
  return useQuery({
    queryKey: ['alerts', 'district', [...statuses].sort()],
    queryFn: () => alertsApi.listForOwnDistrict(statuses),
  })
}

/**
 * One page of the public list. Keyed on everything that changes the answer, and keeps the
 * previous page on screen while the next loads so switching order does not blank the list.
 */
export function useRankedReports(params: {
  ranking: ReportRanking
  district?: string
  statuses: AlertStatus[]
  page: number
  size: number
}) {
  return useQuery({
    queryKey: ['alerts', 'ranked', params.ranking, params.district ?? '', [...params.statuses].sort(), params.page, params.size],
    queryFn: () => alertsApi.listRanked(params),
    placeholderData: (previous) => previous,
  })
}
