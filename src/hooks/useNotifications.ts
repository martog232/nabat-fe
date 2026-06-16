import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api/notifications'
import type { Notification } from '../types'

const NOTIFICATIONS_KEY = ['notifications']
const UNREAD_COUNT_KEY = ['notifications', 'unread', 'count']

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: notificationsApi.getAll,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30_000,
  })
}

export function useMarkAsRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY })
      await qc.cancelQueries({ queryKey: UNREAD_COUNT_KEY })

      const prev = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY)

      qc.setQueryData<Notification[]>(NOTIFICATIONS_KEY, (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )

      qc.setQueryData<{ count: number }>(UNREAD_COUNT_KEY, (old) =>
        old ? { count: Math.max(0, old.count - 1) } : old,
      )

      return { prev }
    },

    onError: (_err, _id, context) => {
      if (context?.prev) {
        qc.setQueryData(NOTIFICATIONS_KEY, context.prev)
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
    },
  })
}

export function useMarkAllAsRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY })
      await qc.cancelQueries({ queryKey: UNREAD_COUNT_KEY })

      const prev = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY)

      qc.setQueryData<Notification[]>(NOTIFICATIONS_KEY, (old) =>
        old?.map((n) => ({ ...n, read: true })),
      )

      qc.setQueryData(UNREAD_COUNT_KEY, { count: 0 })

      return { prev }
    },

    onError: (_err, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(NOTIFICATIONS_KEY, context.prev)
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
    },
  })
}
