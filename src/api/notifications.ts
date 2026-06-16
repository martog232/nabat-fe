import type { Notification, UnreadCountResponse } from '../types'
import { apiClient } from './client'

export const notificationsApi = {
  getAll: () =>
    apiClient.get<Notification[]>('/notifications').then((r) => r.data),

  getUnread: () =>
    apiClient.get<Notification[]>('/notifications/unread').then((r) => r.data),

  getUnreadCount: () =>
    apiClient.get<UnreadCountResponse>('/notifications/unread/count').then((r) => r.data),

  markAsRead: (id: string) =>
    apiClient.post<Notification>(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () =>
    apiClient.post('/notifications/read-all').then(() => {}),
}
