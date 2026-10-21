import { useAlertStore } from '../../store/alertStore'
import { useVoteData, useVote, useRemoveVote } from '../../hooks/useVotes'
import { useAlert, useNearbyAlerts } from '../../hooks/useAlerts'
import { useAuthStore } from '../../store/authStore'
import { CLOSED_BY_LABELS } from '../../types'
import { GroupIcon } from '../common/GroupIcon'
import { StatusBadge } from '../common/Badge'
import { useDistrictNames } from '../../hooks/useDistricts'
import { useAuthorityNames } from '../../hooks/useAuthorities'
import { useCategoryIndex } from '../../hooks/useCategories'
import { resolveCategory } from '../../utils/categories'

import { ReportActions } from './ReportActions'
import { FixCheckPanel } from './FixCheckPanel'
import { CommentThread } from './CommentThread'
import { ForwardHistory } from './ForwardHistory'
import { ReportTimeline } from './ReportTimeline'
import { RejectionPanel } from './RejectionPanel'
import { OverdueBadge } from './OverdueBadge'
import { overdueDays } from '../../utils/deadline'
import { Building2, CalendarDays, Eye, Landmark, X } from 'lucide-react'

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
  const authorityNames = useAuthorityNames()
  const categoryIndex = useCategoryIndex()

  const { data: voteData } = useVoteData(selectedAlert?.id ?? '')
  const stats = voteData?.stats
  const myVote = voteData?.myVote
  const vote = useVote(selectedAlert?.id ?? '')
  const removeVote = useRemoveVote(selectedAlert?.id ?? '')

  if (!selectedAlert) return null

  const a = selectedAlert
  const category = resolveCategory(categoryIndex, a.categoryCode)

  const isMutating = vote.isPending || removeVote.isPending
  // People who say they see it: confirmations, and the upvotes from before there was only one
  // way to say so. The same number the public list ranks by.
  const seenBy = stats ? stats.confirmations + stats.upvotes : 0
  // An old upvote was the same statement, so it shows as having confirmed.
  const iSeeIt = myVote?.voteType === 'CONFIRM' || myVote?.voteType === 'UPVOTE'

  const toggleSeen = () => {
    if (!user || isMutating) return
    // Pressing it again takes it back; otherwise confirm — over an old downvote too, which
    // the backend replaces.
    if (iSeeIt) removeVote.mutate()
    else vote.mutate('CONFIRM')
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
                <OverdueBadge alert={a} />
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
            {/* Said only when it is not the district: a bus stop goes to the Centre for Urban
                Mobility wherever it is, and the reader should know who was asked. */}
            {a.authorityCode && a.authorityCode !== a.districtCode && (
              <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" aria-hidden /> Отговаря: {authorityNames.get(a.authorityCode) ?? a.authorityCode}</span>
            )}
          </div>

          {/* The clock the authority is on, while it is on one and not yet past it. */}
          {a.answerDueAt && overdueDays(a) === null && (
            <div className="text-xs text-slate-500">Срок за отговор: {formatDate(a.answerDueAt)}</div>
          )}

          {/* Who closed it matters as much as that it closed: the authority saying "fixed"
              and the reporter saying so are not the same claim. */}
          {a.status === 'RESOLVED' && a.resolvedAt && (
            <div className="text-xs text-slate-500">
              Решен {a.closedBy ? CLOSED_BY_LABELS[a.closedBy] + ' ' : ''}на {formatDate(a.resolvedAt)}
            </div>
          )}
          {a.status === 'WITHDRAWN' && (
            <div className="text-xs text-slate-500">Оттеглен от подателя. Защо — в дискусията.</div>
          )}
          {a.status === 'REJECTED' && (
            <div className="text-xs text-slate-500">
              Отхвърлен{a.closedBy ? ' ' + CLOSED_BY_LABELS[a.closedBy] : ''}
            </div>
          )}

          {/* Why, and the reporter's way to contest it. */}
          <RejectionPanel alert={a} />

          {/* "Is it really fixed?" — only on a resolved report. */}
          <FixCheckPanel alert={a} />

          {/* What this user may do to move the report along — the district's steps, and
              "fixed" for whoever may say so. Renders nothing for everyone else. */}
          <ReportActions alert={a} />

          {/* Where it has been, when it has moved: the chain is part of the record. */}
          <ForwardHistory alert={a} />

          {/* Who did what, by name: folded away until asked for. */}
          <ReportTimeline alert={a} />

          {/*
            "I see it too" — the one thing a passer-by can add to a report. Up/down votes and a
            credibility score were the safety feed's question, "is this real?"; for a pothole,
            supporting and confirming are the same statement, and a report that is not real is
            for its authority or a moderator to reject, saying why.

            The count renders straight from the cache, which `useVote.onMutate` has already
            moved, so it changes on the click; nothing may hide it while the request is in
            flight. The pressed state is the only in-flight cue, and a failed vote rolls the
            cache back and raises a toast.
          */}
          {stats && (
            <button
              type="button"
              aria-pressed={iSeeIt}
              disabled={!user || isMutating}
              onClick={toggleSeen}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 sm:py-2 text-sm transition
                ${iSeeIt
                  ? 'border-brand-500/50 bg-brand-500/10 text-brand-600'
                  : 'border-surface-border bg-surface-elevated text-slate-700 hover:border-brand-500/30'}
                ${isMutating ? 'scale-[0.98]' : ''}
                disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <span className="inline-flex items-center gap-2 font-semibold">
                <Eye className="h-4 w-4" aria-hidden /> {iSeeIt ? 'Виждате го' : 'И аз го виждам'}
              </span>
              <span className="text-xs text-slate-600">
                {seenBy === 1 ? '1 човек го вижда' : `${seenBy} души го виждат`}
              </span>
            </button>
          )}

          {!user && (
            <p className="text-xs text-slate-500 text-center">
              <a href="/login" className="text-brand-400 hover:underline">Влезте</a>, за да потвърдите, че го виждате
            </p>
          )}

          {/* Last, under everything that changes the report: talking about it does not. */}
          <CommentThread alert={a} />
        </div>
      </div>
    </div>
  )
}
