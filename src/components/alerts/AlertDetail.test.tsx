import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AlertDetail } from './AlertDetail'
import { useAlertStore } from '../../store/alertStore'
import { useAuthStore } from '../../store/authStore'
import { votesApi } from '../../api/votes'
import type { Alert, User, VoteReceipt } from '../../types'
import { UNCHECKED_FIX } from '../../types'

/**
 * What these pin down is timing, not markup: a vote is applied to the cache on the click
 * and reconciled with the server afterwards, so the tally must move while the request is
 * still in flight. That was broken by presentation alone — the optimistic update ran, and
 * a spinner drawn over the count hid its result until the response came back, which reads
 * to a user as a vote that takes seconds to register.
 */

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

const user: User = {
  id: 'user-1',
  email: 'voter@example.com',
  displayName: 'Voter',
  role: 'USER',
  authorityCode: null,
  enabled: true,
  emailVerified: true,
}

vi.mock('../../hooks/useAlerts', () => ({
  useNearbyAlerts: () => ({ data: [alert] }),
  // The report is on the map in these tests, so nothing is fetched on its own.
  useAlert: () => ({ data: undefined }),
  useResolveAlert: () => ({ mutate: vi.fn(), isPending: false }),
  useReportAction: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../hooks/useDistricts', () => ({
  useDistrictNames: () => new Map([['LOZENETS', 'Район Лозенец']]),
}))

vi.mock('../../hooks/useAuthorities', () => ({
  useAuthorityNames: () => new Map([['LOZENETS', 'Район Лозенец']]),
}))

vi.mock('../../api/votes', () => ({
  votesApi: {
    getStats: vi.fn(),
    getMyVote: vi.fn(),
    vote: vi.fn(),
    removeVote: vi.fn(),
  },
}))

const mockedVotesApi = vi.mocked(votesApi)

function renderDetail() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AlertDetail />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useAlertStore.setState({ selectedAlertId: alert.id })
  useAuthStore.setState({ user })
  mockedVotesApi.getStats.mockResolvedValue({
    upvotes: 5,
    downvotes: 1,
    confirmations: 3,
    credibilityScore: 10,
  })
  mockedVotesApi.getMyVote.mockResolvedValue({ hasVoted: false, voteType: null })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AlertDetail: "I see it too"', () => {
  it('shows the incremented count while the confirmation is still in flight', async () => {
    // Never resolves during the test: anything the assertions see is optimistic.
    mockedVotesApi.vote.mockReturnValue(new Promise<VoteReceipt>(() => {}))
    renderDetail()

    // Confirmations and the old upvotes, which said the same thing: 3 + 5.
    const seen = await screen.findByRole('button', { name: /И аз го виждам/ })
    expect(seen).toHaveTextContent('8 души го виждат')

    await userEvent.click(seen)

    expect(seen).toHaveTextContent('9 души го виждат')
    expect(seen).toHaveAttribute('aria-pressed', 'true')
    expect(mockedVotesApi.vote).toHaveBeenCalledWith(alert.id, { voteType: 'CONFIRM' })
  })

  it('rolls the count back when the confirmation fails', async () => {
    mockedVotesApi.vote.mockRejectedValue(new Error('network down'))
    renderDetail()

    const seen = await screen.findByRole('button', { name: /И аз го виждам/ })
    await userEvent.click(seen)

    await waitFor(() => expect(seen).toHaveTextContent('8 души го виждат'))
  })

  /** An old upvote said the same: it shows as confirmed, and pressing takes it back. */
  it('counts an old upvote as having seen it', async () => {
    mockedVotesApi.getMyVote.mockResolvedValue({ hasVoted: true, voteType: 'UPVOTE' })
    mockedVotesApi.removeVote.mockReturnValue(new Promise(() => {}))
    renderDetail()

    const seen = await screen.findByRole('button', { name: /Виждате го/ })
    await userEvent.click(seen)

    expect(mockedVotesApi.removeVote).toHaveBeenCalledWith(alert.id)
  })

  it('offers no up or down votes and no credibility score', async () => {
    renderDetail()
    await screen.findByRole('button', { name: /И аз го виждам/ })

    expect(screen.queryByText(/Подкрепям|Оспорвам|достоверност/)).not.toBeInTheDocument()
  })
})
