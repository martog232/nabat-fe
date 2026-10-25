import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReportTimeline } from './ReportTimeline'
import { useAuthStore } from '../../store/authStore'
import { alertsApi } from '../../api/alerts'
import type { Alert } from '../../types'
import { UNCHECKED_FIX } from '../../types'

vi.mock('../../api/alerts', () => ({
  alertsApi: { history: vi.fn() },
}))

vi.mock('../../hooks/useAuthorities', () => ({
  useAuthorityNames: () => new Map([['LOZENETS', 'Район Лозенец']]),
}))

const report: Alert = {
  id: 'r1', title: 'Дупка', description: 'd', categoryCode: 1007, latitude: 42.67, longitude: 23.32,
  createdAt: '2026-10-19T10:00:00Z', status: 'ACKNOWLEDGED', reportedBy: 'reporter',
  upvoteCount: 0, downvoteCount: 0, confirmationCount: 0, credibilityScore: 0, resolvedAt: null,
  districtCode: 'LOZENETS', authorityCode: 'LOZENETS', answerDueAt: null, closedBy: null, fixCheck: UNCHECKED_FIX,
}

afterEach(cleanup)

describe('ReportTimeline', () => {
  /** The person, not just "the district" — and nabat's own delivery without a name. */
  it('says who took each step, once opened', async () => {
    useAuthStore.setState({
      user: { id: 'u', email: 'u@example.com', displayName: 'u', role: 'USER', authorityCode: null, enabled: true, emailVerified: true },
    })
    vi.mocked(alertsApi.history).mockResolvedValue([
      { step: 'SENT', actorName: null, byAuthority: false, authorityCode: 'LOZENETS', happenedAt: '2026-10-19T10:01:00Z' },
      { step: 'ACKNOWLEDGED', actorName: 'Иван Петров', byAuthority: true, authorityCode: 'LOZENETS', happenedAt: '2026-10-20T09:00:00Z' },
    ])
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ReportTimeline alert={report} />
      </QueryClientProvider>,
    )

    expect(alertsApi.history).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'История на сигнала' }))

    expect(await screen.findByText(/Изпратен до Район Лозенец/)).toBeInTheDocument()
    expect(screen.getByText(/от Иван Петров \(Район Лозенец\)/)).toBeInTheDocument()
  })
})
