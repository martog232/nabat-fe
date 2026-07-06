import { useAlertStore } from '../../store/alertStore'
import { useVoteData, useVote, useRemoveVote } from '../../hooks/useVotes'
import { useResolveAlert, useNearbyAlerts } from '../../hooks/useAlerts'
import { useAuthStore } from '../../store/authStore'
import { ALERT_TYPE_ICONS, ALERT_TYPE_LABELS } from '../../types'
import { SeverityBadge } from '../common/Badge'
import type { VoteType } from '../../types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function AlertDetail() {
  const selectedAlertId = useAlertStore((s) => s.selectedAlertId)
  const selectAlert = useAlertStore((s) => s.selectAlert)
  const { data: alerts = [] } = useNearbyAlerts()
  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? null
  const user = useAuthStore((s) => s.user)

  const { data: voteData } = useVoteData(selectedAlert?.id ?? '')
  const stats = voteData?.stats
  const myVote = voteData?.myVote
  const vote = useVote(selectedAlert?.id ?? '')
  const removeVote = useRemoveVote(selectedAlert?.id ?? '')
  const resolveAlert = useResolveAlert(selectedAlert?.id ?? '')

  if (!selectedAlert) return null

  const a = selectedAlert

  // The vote type currently being submitted — used to show a per-button spinner
  const pendingVoteType = vote.isPending ? vote.variables : undefined
  const isMutating = vote.isPending || removeVote.isPending
  const canResolve =
    a.status === 'ACTIVE' &&
    !!user &&
    (user.id === a.reportedBy || user.role === 'ADMIN')

  const credibilityScore = stats
    ? stats.credibilityScore
    : 0

  const handleVote = (voteType: VoteType) => {
    if (!user || isMutating) return
    if (myVote?.voteType === voteType) {
      // Clicking the vote you already hold toggles it off.
      removeVote.mutate()
    } else {
      // New vote, or a switch to a different type — the backend upserts either way.
      vote.mutate(voteType)
    }
  }

  const handleResolve = () => {
    if (!canResolve || resolveAlert.isPending) return
    resolveAlert.mutate()
  }

  return (
    <div className="absolute bottom-20 left-0 right-0 mx-4 sm:left-auto sm:right-4 sm:mx-0 sm:w-96 z-[1000] animate-slide-in-right">
      <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-4 border-b border-surface-border">
          <button
            onClick={() => selectAlert(null)}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-surface-elevated transition"
          >
            ✕
          </button>

          <div className="flex items-start gap-3 pr-8">
            <div className="text-3xl">{ALERT_TYPE_ICONS[a.type]}</div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-200 text-base leading-tight mb-1">{a.title}</h3>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={a.severity} />
                <span className="text-xs text-slate-500">{ALERT_TYPE_LABELS[a.type]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{a.description}</p>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>📅 {formatDate(a.createdAt)}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                a.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              {a.status}
            </span>
          </div>

          {a.status === 'RESOLVED' && a.resolvedAt && (
            <div className="text-xs text-slate-500">Resolved {formatDate(a.resolvedAt)}</div>
          )}

          {/* Resolve button */}
          {canResolve && (
            <button
              onClick={handleResolve}
              disabled={resolveAlert.isPending}
              className="w-full rounded-xl border border-brand-500/40 bg-brand-500/10 text-brand-400 py-2 text-sm font-semibold hover:border-brand-500/70 hover:bg-brand-500/15 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {resolveAlert.isPending ? 'Resolving…' : 'Resolve alert'}
            </button>
          )}

          {/* Vote buttons */}
          {stats && (
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { label: 'Up',      emoji: '👍', val: stats.upvotes,       type: 'UPVOTE'   },
                  { label: 'Down',    emoji: '👎', val: stats.downvotes,     type: 'DOWNVOTE' },
                  { label: 'Confirm', emoji: '✅', val: stats.confirmations, type: 'CONFIRM'  },
                ] as { label: string; emoji: string; val: number; type: VoteType }[]
              ).map(({ label, emoji, val, type }) => {
                const isThisPending = pendingVoteType === type
                const isRemoving    = removeVote.isPending && myVote?.voteType === type
                const isActive      = myVote?.voteType === type && !isMutating
                const isAnyPending  = isMutating && !isThisPending && !isRemoving

                return (
                  <button
                    key={type}
                    disabled={!user || isAnyPending || isThisPending || isRemoving}
                    onClick={() => handleVote(type)}
                    className={`
                      relative flex flex-col items-center py-2 rounded-xl border
                      transition-all duration-150 cursor-pointer overflow-hidden
                      ${isThisPending || isRemoving
                        ? 'border-brand-500/60 bg-brand-500/15 scale-95'
                        : isActive
                          ? 'border-brand-500/50 bg-brand-500/10'
                          : 'border-surface-border bg-surface-elevated hover:border-brand-500/30 hover:scale-[1.03]'}
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                    `}
                  >
                    {/* Spinner overlay when this button is pending */}
                    {(isThisPending || isRemoving) && (
                      <span className="absolute inset-0 flex items-center justify-center bg-brand-500/10 rounded-xl">
                        <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                      </span>
                    )}
                    <span className={`text-xs font-bold text-slate-900 dark:text-white transition-opacity ${isThisPending || isRemoving ? 'opacity-0' : 'opacity-100'}`}>
                      {val}
                    </span>
                    <span className={`text-xs text-slate-600 dark:text-slate-400 transition-opacity ${isThisPending || isRemoving ? 'opacity-0' : 'opacity-100'}`}>
                      {emoji} {label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {stats && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-surface-border">
              <span>Credibility score</span>
              <span className={`font-bold ${credibilityScore > 0 ? 'text-green-400' : credibilityScore < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {credibilityScore > 0 ? '+' : ''}{credibilityScore}
              </span>
            </div>
          )}

          {!user && (
            <p className="text-xs text-slate-500 text-center">
              <a href="/login" className="text-brand-400 hover:underline">Sign in</a> to vote
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
