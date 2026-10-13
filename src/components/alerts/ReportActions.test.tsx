import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportActions } from './ReportActions'
import { useAuthStore } from '../../store/authStore'
import type { Alert, User } from '../../types'

const actionMutate = vi.fn()
const resolveMutate = vi.fn()

vi.mock('../../hooks/useAlerts', () => ({
  useReportAction: () => ({ mutate: actionMutate, isPending: false, variables: undefined }),
  useResolveAlert: () => ({ mutate: resolveMutate, isPending: false }),
}))

const report: Alert = {
  id: 'r1',
  title: 'Pothole',
  description: 'Outside number 12',
  categoryCode: 1007,
  latitude: 42.67,
  longitude: 23.32,
  createdAt: '2026-09-28T10:00:00Z',
  status: 'SENT',
  reportedBy: 'reporter',
  upvoteCount: 0,
  downvoteCount: 0,
  confirmationCount: 0,
  credibilityScore: 0,
  resolvedAt: null,
  districtCode: 'LOZENETS',
  closedBy: null,
}

const account = (id: string, role: User['role'], districtCode: string | null = null): User => ({
  id, email: `${id}@example.com`, displayName: id, role, districtCode, enabled: true, emailVerified: true,
})

const signIn = (u: User) => useAuthStore.setState({ user: u })
const labels = () => screen.queryAllByRole('button').map((b) => b.textContent)

beforeEach(() => {
  actionMutate.mockReset()
  resolveMutate.mockReset()
})
afterEach(cleanup)

describe('ReportActions', () => {
  it('gives the report\'s own district every step it can still take', () => {
    signIn(account('o1', 'DISTRICT_OFFICIAL', 'LOZENETS'))
    render(<ReportActions alert={report} />)
    expect(labels()).toEqual(['Приеми', 'Започни работа', 'Маркирай като решен', 'Отхвърли'])
  })

  it('stops offering a step the report is already past', () => {
    signIn(account('o1', 'DISTRICT_OFFICIAL', 'LOZENETS'))
    render(<ReportActions alert={{ ...report, status: 'IN_PROGRESS' }} />)
    expect(labels()).toEqual(['Маркирай като решен', 'Отхвърли'])
  })

  /** Nothing at all, not a set of buttons that would each answer 403. */
  it('shows an official of another district nothing', () => {
    signIn(account('o2', 'DISTRICT_OFFICIAL', 'TRIADITSA'))
    const { container } = render(<ReportActions alert={report} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lets the reporter mark their own report fixed, and nothing more', () => {
    signIn(account('reporter', 'USER'))
    render(<ReportActions alert={report} />)
    expect(labels()).toEqual(['Маркирай като решен'])
  })

  it('sends the step that was clicked', async () => {
    signIn(account('o1', 'DISTRICT_OFFICIAL', 'LOZENETS'))
    render(<ReportActions alert={report} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Започни работа' }))
    expect(actionMutate).toHaveBeenCalledWith('startWork')
    expect(resolveMutate).not.toHaveBeenCalled()
  })

  it('shows nothing on a closed report', () => {
    signIn(account('o1', 'DISTRICT_OFFICIAL', 'LOZENETS'))
    const { container } = render(<ReportActions alert={{ ...report, status: 'RESOLVED' }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
