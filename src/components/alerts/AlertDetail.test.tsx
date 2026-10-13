import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AlertDetail } from './AlertDetail'
import { useAlertStore } from '../../store/alertStore'
import { useAuthStore } from '../../store/authStore'
import { votesApi } from '../../api/votes'
import type { Alert, User, VoteReceipt } from '../../types'

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
  closedBy: null,
}

const user: User = {
  id: 'user-1',
  email: 'voter@example.com',
  displayName: 'Voter',
  role: 'USER',
  districtCode: null,
  enabled: true,
  emailVerified: true,
}

vi.mock('../../hooks/useAlerts', () => ({
  useNearbyAlerts: () => ({ data: [alert] }),
  useResolveAlert: () => ({ mutate: vi.fn(), isPending: false }),
  useReportAction: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../hooks/useDistricts', () => ({
  useDistrictNames: () => new Map([['LOZENETS', 'Район Лозенец']]),
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

describe('AlertDetail voting', () => {
  it('shows the incremented count while the vote request is still in flight', async () => {
    // Never resolves during the test: anything the assertions see is optimistic.
    mockedVotesApi.vote.mockReturnValue(new Promise<VoteReceipt>(() => {}))
    renderDetail()

    const upvote = await screen.findByRole('button', { name: /👍 Подкрепям/ })
    expect(upvote).toHaveTextContent('5')

    await userEvent.click(upvote)

    expect(upvote).toHaveTextContent('6')
    // jsdom loads no stylesheet, so a count hidden by a class still reads as text.
    // The regression was presentational, so the assertion has to name the two things
    // that did the hiding — an opacity toggle on the number and a spinner over it.
    expect(upvote.innerHTML).not.toContain('opacity-0')
    expect(upvote.innerHTML).not.toContain('animate-spin')
    expect(mockedVotesApi.vote).toHaveBeenCalledWith(alert.id, { voteType: 'UPVOTE' })
  })

  it('keeps the button highlighted from the click, not from the response', async () => {
    mockedVotesApi.vote.mockReturnValue(new Promise<VoteReceipt>(() => {}))
    renderDetail()

    const upvote = await screen.findByRole('button', { name: /👍 Подкрепям/ })
    await userEvent.click(upvote)

    expect(upvote.className).toContain('border-brand-500')
  })

  it('rolls the count back when the vote fails', async () => {
    mockedVotesApi.vote.mockRejectedValue(new Error('network down'))
    renderDetail()

    const upvote = await screen.findByRole('button', { name: /👍 Подкрепям/ })
    await userEvent.click(upvote)

    await waitFor(() => expect(upvote).toHaveTextContent('5'))
  })
})
