import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { votesApi } from '../api/votes'
import { useToastStore } from '../store/toastStore'
import type { ErrorResponse, VoteDetails, VoteStats, VoteType } from '../types'

const voteDataKey = (alertId: string) => ['votes', alertId] as const

const COUNTER_KEY: Record<VoteType, 'upvotes' | 'downvotes' | 'confirmations'> = {
  UPVOTE: 'upvotes',
  DOWNVOTE: 'downvotes',
  CONFIRM: 'confirmations',
}

/**
 * Optimistically moves the voter from `from` to `to` (either may be null).
 *
 * `credibilityScore` is deliberately left untouched. It used to be recomputed here as
 * `upvotes - downvotes + confirmations * 2` — a fourth independent copy of a formula
 * that also lived in nabat-app's `Alert`, nabat-voting's `AlertCredibility`, and its
 * `VoteStats.fromCounts`. The voting service owns it; the authoritative value arrives
 * in the mutation response a moment later, and showing a marginally stale score for
 * that moment is better than having a second implementation to keep in step.
 */
function applyVoteChange(stats: VoteStats, from: VoteType | null, to: VoteType | null): VoteStats {
  const next = { ...stats }
  if (from) next[COUNTER_KEY[from]] = Math.max(0, next[COUNTER_KEY[from]] - 1)
  if (to) next[COUNTER_KEY[to]] += 1
  return next
}

function errorCode(err: unknown): string | undefined {
  return (err as AxiosError<ErrorResponse>).response?.data?.code
}

/**
 * Stats plus the current user's vote.
 *
 * Still two requests, because "have I voted" is per-user state that cannot be cached
 * alongside the shared tallies. Note that alert list responses already include
 * `credibilityScore` and the three counts, so components that only render totals
 * should read them off the `Alert` rather than calling this at all.
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

    // The server returns the authoritative tallies with the vote, so the cache can be
    // corrected immediately instead of waiting for a refetch.
    onSuccess: (receipt) => {
      qc.setQueryData<VoteDetails>(voteDataKey(alertId), {
        stats: receipt.stats,
        myVote: { hasVoted: true, voteType: receipt.voteType },
      })
    },

    onError: (err, _voteType, context) => {
      if (context?.prev) qc.setQueryData(voteDataKey(alertId), context.prev)

      // VOTE_ALREADY_CAST means the identical vote is already recorded — the UI was
      // already right, so resync quietly.
      //
      // This used to test for HTTP 409, which was wrong: the backend collapsed *every*
      // voting-service failure (outage, 401 from a bad service credential, 500) into a
      // 409, so a complete outage silently rolled the vote back with no explanation.
      // The backend now distinguishes them, and this branches on the error code.
      if (errorCode(err) === 'VOTE_ALREADY_CAST') return

      useToastStore.getState().addToast({
        type: 'error',
        message:
          errorCode(err) === 'SERVICE_UNAVAILABLE'
            ? 'Voting is temporarily unavailable. Please try again in a moment.'
            : 'Vote failed — your action was undone. Please try again.',
      })
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: voteDataKey(alertId) })
      // Alert payloads carry the tallies too, so they are now stale as well.
      qc.invalidateQueries({ queryKey: ['alerts'] })
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

    onSuccess: (stats) => {
      qc.setQueryData<VoteDetails>(voteDataKey(alertId), {
        stats,
        myVote: { hasVoted: false, voteType: null },
      })
    },

    onError: (err, _vars, context) => {
      if (context?.prev) qc.setQueryData(voteDataKey(alertId), context.prev)
      useToastStore.getState().addToast({
        type: 'error',
        message:
          errorCode(err) === 'SERVICE_UNAVAILABLE'
            ? 'Voting is temporarily unavailable. Please try again in a moment.'
            : 'Could not remove your vote — action was undone. Please try again.',
      })
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: voteDataKey(alertId) })
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
