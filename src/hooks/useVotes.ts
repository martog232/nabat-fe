import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { votesApi } from '../api/votes'
import { useToastStore } from '../store/toastStore'
import type { MyVoteResponse, VoteStats, VoteType } from '../types'

const statsKey = (alertId: string) => ['votes', alertId, 'stats'] as const
const meKey = (alertId: string) => ['votes', alertId, 'me'] as const

const COUNTER_KEY: Record<VoteType, 'upvotes' | 'downvotes' | 'confirmations'> = {
  UPVOTE: 'upvotes',
  DOWNVOTE: 'downvotes',
  CONFIRM: 'confirmations',
}

function withScore(stats: VoteStats): VoteStats {
  return { ...stats, credibilityScore: stats.upvotes - stats.downvotes + stats.confirmations * 2 }
}

/**
 * Moves the voter from `from` to `to` (either may be null) and recomputes the
 * credibility score. Mirrors the backend upsert: changing a vote decrements the
 * previous bucket and increments the new one in a single step.
 */
function applyVoteChange(stats: VoteStats, from: VoteType | null, to: VoteType | null): VoteStats {
  const next = { ...stats }
  if (from) next[COUNTER_KEY[from]] = Math.max(0, next[COUNTER_KEY[from]] - 1)
  if (to) next[COUNTER_KEY[to]] += 1
  return withScore(next)
}

export function useVoteStats(alertId: string) {
  return useQuery({
    queryKey: statsKey(alertId),
    queryFn: () => votesApi.getStats(alertId),
    enabled: !!alertId,
  })
}

export function useMyVote(alertId: string) {
  return useQuery({
    queryKey: meKey(alertId),
    queryFn: () => votesApi.getMyVote(alertId),
    enabled: !!alertId,
  })
}

export function useVote(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (voteType: VoteType) => votesApi.vote(alertId, { voteType }),

    onMutate: async (voteType: VoteType) => {
      await qc.cancelQueries({ queryKey: statsKey(alertId) })
      await qc.cancelQueries({ queryKey: meKey(alertId) })

      const prevStats = qc.getQueryData<VoteStats>(statsKey(alertId))
      const prevMyVote = qc.getQueryData<MyVoteResponse>(meKey(alertId))

      if (prevStats) {
        qc.setQueryData(statsKey(alertId), applyVoteChange(prevStats, prevMyVote?.voteType ?? null, voteType))
      }
      qc.setQueryData<MyVoteResponse>(meKey(alertId), { hasVoted: true, voteType })

      return { prevStats, prevMyVote }
    },

    onError: (err, _voteType, context) => {
      if (context?.prevStats !== undefined) qc.setQueryData(statsKey(alertId), context.prevStats)
      if (context?.prevMyVote !== undefined) qc.setQueryData(meKey(alertId), context.prevMyVote)
      // 409 means the identical vote already exists — the UI is already correct,
      // so resync quietly instead of alarming the user.
      if ((err as AxiosError).response?.status !== 409) {
        useToastStore.getState().addToast({
          type: 'error',
          message: 'Vote failed — your action was undone. Please try again.',
        })
      }
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
      await qc.cancelQueries({ queryKey: statsKey(alertId) })
      await qc.cancelQueries({ queryKey: meKey(alertId) })

      const prevStats = qc.getQueryData<VoteStats>(statsKey(alertId))
      const prevMyVote = qc.getQueryData<MyVoteResponse>(meKey(alertId))

      if (prevStats) {
        qc.setQueryData(statsKey(alertId), applyVoteChange(prevStats, prevMyVote?.voteType ?? null, null))
      }
      qc.setQueryData<MyVoteResponse>(meKey(alertId), { hasVoted: false, voteType: null })

      return { prevStats, prevMyVote }
    },

    onError: (_err, _vars, context) => {
      if (context?.prevStats !== undefined) qc.setQueryData(statsKey(alertId), context.prevStats)
      if (context?.prevMyVote !== undefined) qc.setQueryData(meKey(alertId), context.prevMyVote)
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