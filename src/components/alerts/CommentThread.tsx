import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useAddComment, useComments, useRemoveComment } from '../../hooks/useComments'
import { useAuthorityNames } from '../../hooks/useAuthorities'
import { canModerateContent } from '../../utils/permissions'
import type { Alert, Comment } from '../../types'
import { COMMENT_MAX_LENGTH, isOpen } from '../../types'

const when = (iso: string) =>
  new Date(iso).toLocaleString('bg-BG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const REMOVED_BY: Record<NonNullable<Comment['removedBy']>, string> = {
  AUTHOR: 'Коментарът е премахнат от автора си.',
  MODERATOR: 'Коментарът е премахнат от модератор.',
}

/**
 * A report's thread: the reporter, the people around it and the district, in one place.
 *
 * Open while the report is. Once it is resolved or rejected the box goes and says why, and
 * the thread stays as it was — what is left to say about a resolved report belongs in "is it
 * really fixed?" above. Signed-out readers are offered a way in; the thread itself needs a
 * session, like the rest of a report.
 */
export function CommentThread({ alert }: { alert: Alert }) {
  const user = useAuthStore((s) => s.user)
  // Marked with the authority's own name: a district, or an institution such as the CGM.
  const authorityNames = useAuthorityNames()
  const authorityName = (alert.authorityCode && authorityNames.get(alert.authorityCode)) || 'Отговорната институция'
  const open = isOpen(alert.status)
  const { data: comments = [], isLoading, isError } = useComments(alert.id, !!user)
  const add = useAddComment(alert.id)
  const remove = useRemoveComment(alert.id)
  const [draft, setDraft] = useState('')

  const text = draft.trim()
  const tooLong = text.length > COMMENT_MAX_LENGTH
  const moderator = canModerateContent(user?.role)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text || tooLong || add.isPending) return
    add.mutate(text, { onSuccess: () => setDraft('') })
  }

  return (
    <section aria-labelledby={`comments-${alert.id}`} className="space-y-2 border-t border-surface-border pt-3">
      <h4 id={`comments-${alert.id}`} className="text-sm font-semibold text-slate-900">
        Коментари{comments.length > 0 ? ` (${comments.length})` : ''}
      </h4>

      {!user && (
        <p className="text-xs text-slate-500">
          <a href="/login" className="text-brand-400 hover:underline">Влезте</a>, за да четете и пишете коментари.
        </p>
      )}

      {user && isLoading && <p className="text-xs text-slate-500">Зареждане…</p>}
      {user && isError && <p className="text-xs text-red-600">Коментарите не можаха да се заредят.</p>}
      {user && !isLoading && !isError && comments.length === 0 && open && (
        <p className="text-xs text-slate-500">Още няма коментари. Знаете ли нещо за този сигнал?</p>
      )}

      {comments.length > 0 && (
        <ol className="space-y-2">
          {comments.map((c) => {
            const removable = !c.removedBy && (moderator || (c.mine && open))
            return (
              <li key={c.id} className="rounded-lg bg-surface-elevated px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span className="font-semibold text-slate-900">{c.authorName}</span>
                  {c.byAuthority && (
                    <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 font-semibold text-blue-700">{authorityName}</span>
                  )}
                  {c.byReporter && (
                    <span className="rounded-full bg-slate-500/10 px-1.5 py-0.5 font-medium text-slate-700">Подател</span>
                  )}
                  <time dateTime={c.createdAt} className="text-slate-500">{when(c.createdAt)}</time>
                  {removable && (
                    <button
                      type="button"
                      onClick={() => remove.mutate(c.id)}
                      disabled={remove.isPending}
                      className="ml-auto text-slate-500 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Премахни коментара на ${c.authorName}`}
                    >
                      Премахни
                    </button>
                  )}
                </div>
                {c.removedBy ? (
                  <p className="mt-1 text-xs italic text-slate-500">{REMOVED_BY[c.removedBy]}</p>
                ) : (
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{c.body}</p>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {user && open && (
        <form onSubmit={submit} className="space-y-1">
          <label htmlFor={`comment-${alert.id}`} className="sr-only">
            Вашият коментар
          </label>
          <textarea
            id={`comment-${alert.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Напишете коментар…"
            className="w-full resize-y rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-slate-800"
          />
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs ${tooLong ? 'text-red-600' : 'text-slate-500'}`}>
              {text.length > COMMENT_MAX_LENGTH - 200 ? `${text.length} / ${COMMENT_MAX_LENGTH}` : ''}
            </span>
            <button
              type="submit"
              disabled={!text || tooLong || add.isPending}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {add.isPending ? 'Публикуване…' : 'Публикувай'}
            </button>
          </div>
        </form>
      )}

      {user && !open && (
        <p className="text-xs text-slate-500">
          {alert.status === 'RESOLVED'
            ? 'Сигналът е решен и коментарите са заключени. Ако не е оправено, кажете го по-горе.'
            : 'Сигналът е отхвърлен и коментарите са заключени.'}
        </p>
      )}
    </section>
  )
}
