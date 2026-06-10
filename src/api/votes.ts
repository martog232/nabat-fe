import type { VoteRequest, VoteStats } from '../types'
import { apiClient } from './client'

export const votesApi = {
  vote: (alertId: string, data: VoteRequest, userId: string) =>
    apiClient.post(`/alerts/${alertId}/votes`, { ...data, userId }).then((r) => r.data),

  removeVote: (alertId: string, userId: string) =>
    apiClient.delete(`/alerts/${alertId}/votes`, { params: { userId } }).then((r) => r.data),

  getStats: (alertId: string) =>
    apiClient.get<VoteStats>(`/alerts/${alertId}/votes/stats`).then((r) => r.data),

  getMyVote: (alertId: string, userId: string) =>
    apiClient
      .get<{ hasVoted: boolean }>(`/alerts/${alertId}/votes/me`, { params: { userId } })
      .then((r) => r.data),
}
