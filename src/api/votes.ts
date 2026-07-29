import type { MyVoteResponse, VoteReceipt, VoteRequest, VoteStats } from '../types'
import { apiClient } from './client'

export const votesApi = {
  /**
   * Casts or changes the caller's vote.
   *
   * The response now carries the resulting tallies, so there is no need to follow up
   * with `getStats` — which, being served from an eventually consistent projection,
   * used to return the counts from *before* this vote.
   */
  vote: (alertId: string, data: VoteRequest) =>
    apiClient.post<VoteReceipt>(`/alerts/${alertId}/votes`, data).then((r) => r.data),

  /** Returns the tallies after removal. */
  removeVote: (alertId: string) =>
    apiClient.delete<VoteStats>(`/alerts/${alertId}/votes`).then((r) => r.data),

  getStats: (alertId: string) =>
    apiClient.get<VoteStats>(`/alerts/${alertId}/votes/stats`).then((r) => r.data),

  getMyVote: (alertId: string) =>
    apiClient
      .get<MyVoteResponse>(`/alerts/${alertId}/votes/me`)
      .then((r) => r.data),
}
