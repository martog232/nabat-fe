import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentsApi } from '../api/comments'
import { errorCodeOf } from '../api/errors'
import { useToastStore } from '../store/toastStore'
import type { Comment } from '../types'

const threadKey = (alertId: string) => ['comments', alertId] as const

/**
 * A refusal because the report closed in the meantime: the thread is right, the report on
 * screen is stale. Refetch the report so the box goes away and says why.
 */
function onLocked(qc: ReturnType<typeof useQueryClient>, alertId: string) {
  qc.invalidateQueries({ queryKey: ['alerts', 'one', alertId] })
  qc.invalidateQueries({ queryKey: ['alerts', 'nearby'] })
  qc.invalidateQueries({ queryKey: threadKey(alertId) })
}

/**
 * The thread, oldest first. Not pushed over the socket yet, so it is refetched when the
 * window regains focus and every half minute while it is open — enough for a conversation
 * about a pothole.
 */
export function useComments(alertId: string, enabled: boolean) {
  return useQuery({
    queryKey: threadKey(alertId),
    queryFn: () => commentsApi.list(alertId),
    enabled: enabled && !!alertId,
    refetchInterval: 30_000,
  })
}

/**
 * Not optimistic: a comment that appears and then vanishes is worse than one that takes a
 * moment, and the server decides who wrote it and in what standing.
 */
export function useAddComment(alertId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => commentsApi.add(alertId, body),
    onSuccess: (added) => {
      qc.setQueryData<Comment[]>(threadKey(alertId), (old) => [...(old ?? []), added])
    },
    onError: (err) => {
      const locked = errorCodeOf(err) === 'COMMENTS_LOCKED'
      if (locked) onLocked(qc, alertId)
      useToastStore.getState().addToast({
        type: 'error',
        message: locked
          ? 'Сигналът междувременно беше затворен, а с него и коментарите.'
          : 'Коментарът не беше публикуван. Опитайте отново.',
      })
    },
  })
}

export function useRemoveComment(alertId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => commentsApi.remove(alertId, commentId),
    onSuccess: (removed) => {
      qc.setQueryData<Comment[]>(threadKey(alertId), (old) => old?.map((c) => (c.id === removed.id ? removed : c)))
    },
    onError: (err) => {
      const locked = errorCodeOf(err) === 'COMMENTS_LOCKED'
      if (locked) onLocked(qc, alertId)
      useToastStore.getState().addToast({
        type: 'error',
        message: locked
          ? 'Сигналът е затворен — коментарите в него вече не могат да се махат.'
          : 'Коментарът не беше премахнат. Опитайте отново.',
      })
    },
  })
}
