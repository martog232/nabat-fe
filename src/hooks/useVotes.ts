import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { votesApi } from '../api/votes'
import { useToastStore } from '../store/toastStore'
import type { VoteStats } from '../types'

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
    mutationFn: () => votesApi.removeVote(alertId),

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
