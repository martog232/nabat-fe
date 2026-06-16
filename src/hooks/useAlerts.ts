import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../api/alerts'
import { useAlertStore } from '../store/alertStore'
import { useToastStore } from '../store/toastStore'
import type { Alert, CreateAlertRequest } from '../types'

export function useNearbyAlerts() {
  const mapCenter = useAlertStore((s) => s.mapCenter)
  const radiusKm = useAlertStore((s) => s.radiusKm)
  return useQuery({
    queryKey: ['alerts', 'nearby', mapCenter, radiusKm],
    queryFn: () => alertsApi.getNearby(mapCenter[0], mapCenter[1], radiusKm),
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


