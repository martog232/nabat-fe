import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVote } from './useVotes'
import { votesApi } from '../api/votes'
import type { Alert, VoteReceipt } from '../types'
import { UNCHECKED_FIX } from '../types'

/**
 * A vote answers with the authoritative tallies, so the caches are written from the
 * response and nothing is refetched.
 *
 * That is not only about saving the three requests a vote used to cost. `/votes/stats`
 * and `/alerts/nearby` are both served from a projection that trails the voting service,
 * so refetching could replace the numbers the vote just returned with older ones — the
 * counter going up and then back down a moment later.
 */

const NEARBY_KEY = ['alerts', 'nearby', 42.698, 23.322, 5]

const alert: Alert = {
  id: 'alert-1',
  title: 'Fire on Main St',
  description: 'A fire broke out near the intersection',
  categoryCode: 1007,
  latitude: 42.7,
  longitude: 23.3,
  createdAt: new Date().toISOString(),
  status: 'SUBMITTED',
  reportedBy: 'user-2',
  upvoteCount: 5,
  downvoteCount: 1,
  confirmationCount: 3,
  credibilityScore: 10,
  resolvedAt: null,
  districtCode: 'LOZENETS',
  authorityCode: 'LOZENETS',
  answerDueAt: null,
  closedBy: null,
  fixCheck: UNCHECKED_FIX,
}

const receipt: VoteReceipt = {
  id: 'vote-1',
  alertId: alert.id,
  voteType: 'UPVOTE',
  createdAt: new Date().toISOString(),
  stats: { upvotes: 6, downvotes: 1, confirmations: 3, credibilityScore: 11 },
}

vi.mock('../api/votes', () => ({
  votesApi: {
    getStats: vi.fn(),
    getMyVote: vi.fn(),
    vote: vi.fn(),
    removeVote: vi.fn(),
  },
}))

const mockedVotesApi = vi.mocked(votesApi)

let qc: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['votes', alert.id], {
    stats: { upvotes: 5, downvotes: 1, confirmations: 3, credibilityScore: 10 },
    myVote: { hasVoted: false, voteType: null },
  })
  qc.setQueryData<Alert[]>(NEARBY_KEY, [alert])
  mockedVotesApi.vote.mockResolvedValue(receipt)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useVote', () => {
  it('writes the tallies from the response onto the cached alert', async () => {
    const { result } = renderHook(() => useVote(alert.id), { wrapper })

    result.current.mutate('UPVOTE')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cached = qc.getQueryData<Alert[]>(NEARBY_KEY)
    expect(cached?.[0]).toMatchObject({
      upvoteCount: 6,
      downvoteCount: 1,
      confirmationCount: 3,
      credibilityScore: 11,
    })
  })

  it('invalidates nothing on the success path', async () => {
    const { result } = renderHook(() => useVote(alert.id), { wrapper })

    result.current.mutate('UPVOTE')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Asserted on the cache entries rather than on the api mocks: with no component
    // subscribed, an invalidated query is marked stale without refetching, so counting
    // calls here would pass against the old hook too. `isInvalidated` is the flag that
    // would have sent three requests in a real screen.
    expect(qc.getQueryState(['votes', alert.id])?.isInvalidated).toBe(false)
    expect(qc.getQueryState(NEARBY_KEY)?.isInvalidated).toBe(false)
  })

  it('leaves the cached alert untouched when the vote fails', async () => {
    mockedVotesApi.vote.mockRejectedValue(new Error('voting service down'))
    const { result } = renderHook(() => useVote(alert.id), { wrapper })

    result.current.mutate('UPVOTE')
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(qc.getQueryData<Alert[]>(NEARBY_KEY)?.[0].upvoteCount).toBe(5)
  })
})
