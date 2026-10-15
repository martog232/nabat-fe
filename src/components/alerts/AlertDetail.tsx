import { useAlertStore } from '../../store/alertStore'
import { useVoteData, useVote, useRemoveVote } from '../../hooks/useVotes'
import { useAlert, useNearbyAlerts } from '../../hooks/useAlerts'
import { useAuthStore } from '../../store/authStore'
import { CLOSED_BY_LABELS } from '../../types'
import { GroupIcon } from '../common/GroupIcon'
import { StatusBadge } from '../common/Badge'
import { useDistrictNames } from '../../hooks/useDistricts'
import { useCategoryIndex } from '../../hooks/useCategories'
import { resolveCategory } from '../../utils/categories'
import type { VoteType } from '../../types'
import { ReportActions } from './ReportActions'
import { FixCheckPanel } from './FixCheckPanel'
import { CommentThread } from './CommentThread'
import { BadgeCheck, CalendarDays, Landmark, ThumbsDown, ThumbsUp, X, type LucideIcon } from 'lucide-react'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('bg-BG', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function AlertDetail() {
  const selectedAlertId = useAlertStore((s) => s.selectedAlertId)
  const selectAlert = useAlertStore((s) => s.selectAlert)
  const { data: alerts = [] } = useNearbyAlerts()
  const inList = alerts.find((a) => a.id === selectedAlertId) ?? null
  // The map's list holds open reports only. A resolved one — opened from the notification
  // asking whether it is really fixed — is fetched on its own.
  const { data: fetched } = useAlert(selectedAlertId, !!selectedAlertId && !inList)
  const selectedAlert = inList ?? (fetched?.id === selectedAlertId ? fetched : null)
  const user = useAuthStore((s) => s.user)
  const districtNames = useDistrictNames()
  const categoryIndex = useCategoryIndex()

  const { data: voteData } = useVoteData(selectedAlert?.id ?? '')
  const stats = voteData?.stats
  const myVote = voteData?.myVote
  const vote = useVote(selectedAlert?.id ?? '')
  const removeVote = useRemoveVote(selectedAlert?.id ?? '')

  if (!selectedAlert) return null

  const a = selectedAlert
  const category = resolveCategory(categoryIndex, a.categoryCode)

  // The vote type currently being submitted — used to show a per-button spinner
  const pendingVoteType = vote.isPending ? vote.variables : undefined
  const isMutating = vote.isPending || removeVote.isPending

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


  return (
    /*
      Phone: a sheet sitting directly on the collapsed alert list, full width, its body
      scrolling inside a 65dvh cap — the vote buttons must stay reachable no matter how long
      the description is, and a card that grows off-screen puts them nowhere.
      Desktop: the card returns to the right edge, clear of the left panel.
    */
    <div className="absolute z-[1000] inset-x-0 bottom-[calc(var(--sheet-peek)+0.75rem)] mx-3 sm:inset-x-auto sm:right-4 sm:mx-0 sm:w-96 sm:bottom-24 animate-slide-in-right">
      <div className="flex flex-col max-h-[65dvh] sm:max-h-[70vh] bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header — stays put while the body scrolls, so the close button is always reachable. */}
        <div className="relative flex-shrink-0 p-4 border-b border-surface-border">
          <button
            onClick={() => selectAlert(null)}
            aria-label="Затвори"
            className="absolute top-2 right-2 w-11 h-11 sm:top-3 sm:right-3 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-surface-elevated transition"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="flex items-start gap-3 pr-12 sm:pr-8">
            <GroupIcon code={category?.group.code} className="h-8 w-8 flex-shrink-0 text-slate-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">{a.title}</h3>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                {category && (
                  <span className="text-xs text-slate-500">
                    {category.group.name} · {category.category.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body — the only scrolling region; overscroll-contain stops a flick here from dragging the map underneath. */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed">{a.description}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatDate(a.createdAt)}</span>
            {a.districtCode && (
              <span className="inline-flex items-center gap-1"><Landmark className="h-3.5 w-3.5" aria-hidden /> {districtNames.get(a.districtCode) ?? a.districtCode}</span>
            )}
          </div>

          {/* Who closed it matters as much as that it closed: the district saying "fixed"
              and the reporter saying so are not the same claim. */}
          {a.status === 'RESOLVED' && a.resolvedAt && (
            <div className="text-xs text-slate-500">
              Решен {a.closedBy ? CLOSED_BY_LABELS[a.closedBy] + ' ' : ''}на {formatDate(a.resolvedAt)}
            </div>
          )}
          {a.status === 'REJECTED' && (
            <div className="text-xs text-slate-500">
              Отхвърлен{a.closedBy ? ' ' + CLOSED_BY_LABELS[a.closedBy] : ''}
            </div>
          )}

          {/* "Is it really fixed?" — only on a resolved report. */}
          <FixCheckPanel alert={a} />

          {/* What this user may do to move the report along — the district's steps, and
              "fixed" for whoever may say so. Renders nothing for everyone else. */}
          <ReportActions alert={a} />

          {/*
            Vote buttons.

            The counts render straight from the cache, which `useVote.onMutate` has
            already moved — so the number changes on the click, not on the response.
            Nothing here may hide it while the request is in flight: a spinner laid over
            the count used to do exactly that, which made an optimistic update look like
            a three-second one. The pressed state is the only in-flight cue, and a failed
            vote rolls the cache back and raises a toast.
          */}
          {stats && (
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { label: 'Подкрепям',    icon: ThumbsUp, val: stats.upvotes,       type: 'UPVOTE'   },
                  { label: 'Оспорвам',     icon: ThumbsDown, val: stats.downvotes,     type: 'DOWNVOTE' },
                  { label: 'Потвърждавам', icon: BadgeCheck, val: stats.confirmations, type: 'CONFIRM'  },
                ] as { label: string; icon: LucideIcon; val: number; type: VoteType }[]
              ).map(({ label, icon: Icon, val, type }) => {
                const isThisPending = pendingVoteType === type
                const isRemoving    = removeVote.isPending && myVote?.voteType === type
                // Read from the optimistic cache, so this does not wait for the server
                // either. It used to be qualified with `&& !isMutating`, which dropped
                // the highlight off the button for the duration of its own request.
                const isActive      = myVote?.voteType === type
                const isAnyPending  = isMutating && !isThisPending && !isRemoving

                return (
                  <button
                    key={type}
                    disabled={!user || isAnyPending || isThisPending || isRemoving}
                    onClick={() => handleVote(type)}
                    className={`
                      relative flex flex-col items-center py-3 sm:py-2 rounded-xl border
                      transition-all duration-150 cursor-pointer overflow-hidden
                      ${isThisPending || isRemoving
                        ? 'border-brand-500/60 bg-brand-500/15 scale-95'
                        : isActive
                          ? 'border-brand-500/50 bg-brand-500/10'
                          : 'border-surface-border bg-surface-elevated hover:border-brand-500/30 hover:scale-[1.03]'}
                      ${isThisPending || isRemoving
                        ? ''
                        : 'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100'}
                    `}
                  >
                    <span className="text-xs font-bold text-slate-900">
                      {val}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {stats && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-surface-border">
              <span>Оценка на достоверност</span>
              <span className={`font-bold ${credibilityScore > 0 ? 'text-green-400' : credibilityScore < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {credibilityScore > 0 ? '+' : ''}{credibilityScore}
              </span>
            </div>
          )}

          {!user && (
            <p className="text-xs text-slate-500 text-center">
              <a href="/login" className="text-brand-400 hover:underline">Влезте</a>, за да гласувате
            </p>
          )}

          {/* Last, under everything that changes the report: talking about it does not. */}
          <CommentThread alert={a} />
        </div>
      </div>
    </div>
  )
}
