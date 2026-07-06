import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { votesApi } from '../api/votes'
import { useToastStore } from '../store/toastStore'
import type { VoteDetails, VoteStats, VoteType } from '../types'

const voteDataKey = (alertId: string) => ['votes', alertId] as const

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

/**
 * Single query that fetches stats + current user's vote together.
 * Both pieces of data arrive in one response batch, so the UI
 * never shows a stale score while the button is already coloured.
 */
export function useVoteData(alertId: string) {
  return useQuery({
    queryKey: voteDataKey(alertId),
    queryFn: async () => {
      const [stats, myVote] = await Promise.all([
        votesApi.getStats(alertId),
        votesApi.getMyVote(alertId),
      ])
      return { stats, myVote } satisfies VoteDetails
    },
    enabled: !!alertId,
  })
}

export function useVote(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (voteType: VoteType) => votesApi.vote(alertId, { voteType }),

    onMutate: async (voteType: VoteType) => {
      await qc.cancelQueries({ queryKey: voteDataKey(alertId) })

      const prev = qc.getQueryData<VoteDetails>(voteDataKey(alertId))

      if (prev) {
        qc.setQueryData<VoteDetails>(voteDataKey(alertId), {
          stats: applyVoteChange(prev.stats, prev.myVote.voteType ?? null, voteType),
          myVote: { hasVoted: true, voteType },
        })
      }

      return { prev }
    },

    onError: (err, _voteType, context) => {
      if (context?.prev) qc.setQueryData(voteDataKey(alertId), context.prev)
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
      qc.invalidateQueries({ queryKey: voteDataKey(alertId) })
    },
  })
}

export function useRemoveVote(alertId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => votesApi.removeVote(alertId),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: voteDataKey(alertId) })

      const prev = qc.getQueryData<VoteDetails>(voteDataKey(alertId))

      if (prev) {
        qc.setQueryData<VoteDetails>(voteDataKey(alertId), {
          stats: applyVoteChange(prev.stats, prev.myVote.voteType ?? null, null),
          myVote: { hasVoted: false, voteType: null },
        })
      }

      return { prev }
    },

    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(voteDataKey(alertId), context.prev)
      useToastStore.getState().addToast({
        type: 'error',
        message: 'Could not remove your vote — action was undone. Please try again.',
      })
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: voteDataKey(alertId) })
    },
  })
}