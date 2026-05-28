import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../api/alerts'
import { votesApi } from '../api/votes'
import { useAlertStore } from '../store/alertStore'
import { useToastStore } from '../store/toastStore'
import type { CreateAlertRequest, VoteStats } from '../types'

export function useNearbyAlerts() {
  const { mapCenter, radiusKm, setAlerts } = useAlertStore()
  return useQuery({
    queryKey: ['alerts', 'nearby', mapCenter, radiusKm],
    queryFn: async () => {
      const alerts = await alertsApi.getNearby(mapCenter[0], mapCenter[1], radiusKm)
      setAlerts(alerts)
      return alerts
    },
    refetchInterval: 30_000,
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
      const prevAlerts = useAlertStore.getState().alerts
      const prevSelected = useAlertStore.getState().selectedAlert

      useAlertStore.getState().upsertAlerts(
        prevAlerts.map((a) =>
          a.id === alertId && a.status === 'ACTIVE'
            ? { ...a, status: 'RESOLVED', resolvedAt: new Date().toISOString() }
            : a,
        ),
      )

      if (prevSelected?.id === alertId) {
        useAlertStore.getState().selectAlert({
          ...prevSelected,
          status: 'RESOLVED',
          resolvedAt: new Date().toISOString(),
        })
      }

      return { prevAlerts, prevSelected }
    },

    onError: (_err, _vars, context) => {
      if (context?.prevAlerts) {
        useAlertStore.getState().setAlerts(context.prevAlerts)
      }
      if (context?.prevSelected) {
        useAlertStore.getState().selectAlert(context.prevSelected)
      }
      useToastStore.getState().addToast({
        type: 'error',
        message: 'Could not resolve the alert — changes were rolled back.',
      })
    },

    onSuccess: (resolved) => {
      useAlertStore.getState().upsertAlerts([resolved])
      if (useAlertStore.getState().selectedAlert?.id === resolved.id) {
        useAlertStore.getState().selectAlert(resolved)
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useVoteStats(alertId: string) {
  return useQuery({
    queryKey: ['votes', alertId, 'stats'],
    queryFn: () => votesApi.getStats(alertId),
    enabled: !!alertId,
  })
}

export function useMyVote(alertId: string) {
  return useQuery({
    queryKey: ['votes', alertId, 'me'],
    queryFn: () => votesApi.getMyVote(alertId),
    enabled: !!alertId,
  })
}

export function useVote(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (voteType: string) => votesApi.vote(alertId, { voteType: voteType as never }),

    onMutate: async (voteType: string) => {
      // Cancel any in-flight refetches so they don't clobber our optimistic data
      await qc.cancelQueries({ queryKey: ['votes', alertId, 'stats'] })
      await qc.cancelQueries({ queryKey: ['votes', alertId, 'me'] })

      // Snapshot current cache for potential rollback
      const prevStats = qc.getQueryData<VoteStats>(['votes', alertId, 'stats'])
      const prevMyVote = qc.getQueryData<{ hasVoted: boolean }>(['votes', alertId, 'me'])

      // Optimistically increment the right vote counter
      if (prevStats) {
        const next = { ...prevStats }
        if (voteType === 'UPVOTE') next.upvoteCount += 1
        else if (voteType === 'DOWNVOTE') next.downvoteCount += 1
        else if (voteType === 'CONFIRM') next.confirmationCount += 1
        qc.setQueryData(['votes', alertId, 'stats'], next)
      }

      // Optimistically mark user as having voted
      qc.setQueryData(['votes', alertId, 'me'], { hasVoted: true })

      return { prevStats, prevMyVote }
    },

    onError: (_err, _voteType, context) => {
      // Roll back to pre-mutation snapshots
      if (context?.prevStats !== undefined) {
        qc.setQueryData(['votes', alertId, 'stats'], context.prevStats)
      }
      if (context?.prevMyVote !== undefined) {
        qc.setQueryData(['votes', alertId, 'me'], context.prevMyVote)
      }
      // Notify the user that the vote was undone
      useToastStore.getState().addToast({
        type: 'error',
        message: 'Vote failed — your action was undone. Please try again.',
      })
    },

    onSettled: () => {
      // Sync with server regardless of outcome
      qc.invalidateQueries({ queryKey: ['votes', alertId] })
    },
  })
}

export function useRemoveVote(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => votesApi.removeVote(alertId),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['votes', alertId, 'stats'] })
      await qc.cancelQueries({ queryKey: ['votes', alertId, 'me'] })

      const prevStats = qc.getQueryData<VoteStats>(['votes', alertId, 'stats'])
      const prevMyVote = qc.getQueryData<{ hasVoted: boolean }>(['votes', alertId, 'me'])

      // Optimistically mark user as not having voted (counts are left to the
      // server invalidation because we don't store which vote type was cast)
      qc.setQueryData(['votes', alertId, 'me'], { hasVoted: false })

      return { prevStats, prevMyVote }
    },

    onError: (_err, _vars, context) => {
      if (context?.prevStats !== undefined) {
        qc.setQueryData(['votes', alertId, 'stats'], context.prevStats)
      }
      if (context?.prevMyVote !== undefined) {
        qc.setQueryData(['votes', alertId, 'me'], context.prevMyVote)
      }
      useToastStore.getState().addToast({
        type: 'error',
        message: 'Could not remove your vote — action was undone. Please try again.',
      })
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['votes', alertId] })
    },
  })
}
