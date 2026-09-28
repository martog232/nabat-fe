import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { votesApi } from '../api/votes'
import { useToastStore } from '../store/toastStore'
import type { Alert, ErrorResponse, VoteDetails, VoteStats, VoteType } from '../types'

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

/**
 * Copies authoritative tallies onto every cached copy of the alert.
 *
 * Alert payloads carry the same four counts, so a vote makes them stale — but refetching
 * them is the wrong repair. `/alerts/nearby` and `/votes/stats` are both served from a
 * projection that trails the voting service, so the invalidation this replaces could
 * overwrite the exact numbers the vote response had just returned with older ones, and
 * spent three requests to do it. Writing the receipt's stats into the cache is both
 * correct and free.
 *
 * Writes across the `['alerts','nearby']` prefix rather than rebuilding the key from the
 * store, for the reason `mergeAlertsIntoCache` gives: the map may have moved since the
 * request went out, and a reconstructed key addresses an entry nobody is subscribed to.
 */
function applyStatsToAlerts(
  qc: ReturnType<typeof useQueryClient>,
  alertId: string,
  stats: VoteStats,
) {
  qc.setQueriesData<Alert[]>({ queryKey: ['alerts', 'nearby'] }, (old) =>
    old?.map((a) =>
      a.id === alertId
        ? {
            ...a,
            upvoteCount: stats.upvotes,
            downvoteCount: stats.downvotes,
            confirmationCount: stats.confirmations,
            credibilityScore: stats.credibilityScore,
          }
        : a,
    ),
  )
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

    // The server returns the authoritative tallies with the vote, so both caches are
    // corrected here and nothing is invalidated on the success path.
    onSuccess: (receipt) => {
      qc.setQueryData<VoteDetails>(voteDataKey(alertId), {
        stats: receipt.stats,
        myVote: { hasVoted: true, voteType: receipt.voteType },
      })
      applyStatsToAlerts(qc, alertId, receipt.stats)
    },

    onError: (err, _voteType, context) => {
      if (context?.prev) qc.setQueryData(voteDataKey(alertId), context.prev)

      // A failure is the one case with no authoritative answer to trust, so this is
      // where a refetch belongs: the rollback above restores what was on screen, and
      // this settles what the services actually recorded. It covers VOTE_ALREADY_CAST
      // too, which returns below without a toast but still needs the resync.
      qc.invalidateQueries({ queryKey: voteDataKey(alertId) })
      qc.invalidateQueries({ queryKey: ['alerts'] })

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

    // Removal answers with the resulting tallies too — same reasoning as useVote.
    onSuccess: (stats) => {
      qc.setQueryData<VoteDetails>(voteDataKey(alertId), {
        stats,
        myVote: { hasVoted: false, voteType: null },
      })
      applyStatsToAlerts(qc, alertId, stats)
    },

    onError: (err, _vars, context) => {
      if (context?.prev) qc.setQueryData(voteDataKey(alertId), context.prev)

      qc.invalidateQueries({ queryKey: voteDataKey(alertId) })
      qc.invalidateQueries({ queryKey: ['alerts'] })

      useToastStore.getState().addToast({
        type: 'error',
        message:
          errorCode(err) === 'SERVICE_UNAVAILABLE'
            ? 'Voting is temporarily unavailable. Please try again in a moment.'
            : 'Could not remove your vote — action was undone. Please try again.',
      })
    },
  })
}
