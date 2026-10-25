import type { Comment } from '../types'
import { apiClient } from './client'

/** A report's thread. Writing is refused with COMMENTS_LOCKED once the report is resolved or rejected. */
export const commentsApi = {
  list: (alertId: string) => apiClient.get<Comment[]>(`/alerts/${alertId}/comments`).then((r) => r.data),

  add: (alertId: string, body: string) =>
    apiClient.post<Comment>(`/alerts/${alertId}/comments`, { body }).then((r) => r.data),

  /** For its author while the report is open, for a moderator at any time. */
  remove: (alertId: string, commentId: string) =>
    apiClient.delete<Comment>(`/alerts/${alertId}/comments/${commentId}`).then((r) => r.data),
}
