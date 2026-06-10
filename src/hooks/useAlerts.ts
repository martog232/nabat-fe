import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../api/alerts'
import { votesApi } from '../api/votes'
import { useAlertStore } from '../store/alertStore'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import type { Alert, CreateAlertRequest, VoteStats } from '../types'

export function useNearbyAlerts() {
  const mapCenter = useAlertStore((s) => s.mapCenter)
  const radiusKm = useAlertStore((s) => s.radiusKm)
  return useQuery({
    queryKey: ['alerts', 'nearby', mapCenter, radiusKm],
    queryFn: () => alertsApi.getNearby(mapCenter[0], mapCenter[1], radiusKm),
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
    queryFn: () => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) return { hasVoted: false }
      return votesApi.getMyVote(alertId, userId)
    },
    enabled: !!alertId,
  })
}

export function useVote(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (voteType: string) => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('Not authenticated')
      return votesApi.vote(alertId, { voteType: voteType as never }, userId)
    },

    onMutate: async (voteType: string) => {
      await qc.cancelQueries({ queryKey: ['votes', alertId, 'stats'] })
      await qc.cancelQueries({ queryKey: ['votes', alertId, 'me'] })

      const prevStats = qc.getQueryData<VoteStats>(['votes', alertId, 'stats'])
      const prevMyVote = qc.getQueryData<{ hasVoted: boolean }>(['votes', alertId, 'me'])

      if (prevStats) {
        const next = { ...prevStats }
        if (voteType === 'UPVOTE') next.upvotes += 1
        else if (voteType === 'DOWNVOTE') next.downvotes += 1
        else if (voteType === 'CONFIRM') next.confirmations += 1
        qc.setQueryData(['votes', alertId, 'stats'], next)
      }

      qc.setQueryData(['votes', alertId, 'me'], { hasVoted: true })

      return { prevStats, prevMyVote }
    },

    onError: (_err, _voteType, context) => {
      if (context?.prevStats !== undefined) {
        qc.setQueryData(['votes', alertId, 'stats'], context.prevStats)
      }
      if (context?.prevMyVote !== undefined) {
        qc.setQueryData(['votes', alertId, 'me'], context.prevMyVote)
      }
      useToastStore.getState().addToast({
        type: 'error',
        message: 'Vote failed — your action was undone. Please try again.',
      })
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['votes', alertId] })
    },
  })
}

export function useRemoveVote(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('Not authenticated')
      return votesApi.removeVote(alertId, userId)
    },

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['votes', alertId, 'stats'] })
      await qc.cancelQueries({ queryKey: ['votes', alertId, 'me'] })

      const prevStats = qc.getQueryData<VoteStats>(['votes', alertId, 'stats'])
      const prevMyVote = qc.getQueryData<{ hasVoted: boolean }>(['votes', alertId, 'me'])

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
