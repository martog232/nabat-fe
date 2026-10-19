import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RejectionPanel } from './RejectionPanel'
import { useAuthStore } from '../../store/authStore'
import type { Alert, Rejection, User } from '../../types'
import { UNCHECKED_FIX } from '../../types'

const disputeMutate = vi.fn()
const decideMutate = vi.fn()
let rejections: Rejection[] = []

vi.mock('../../hooks/useRejections', () => ({
  useRejections: () => ({ data: rejections }),
  useDisputeRejection: () => ({ mutate: disputeMutate, isPending: false }),
  useDecideDispute: () => ({ mutate: decideMutate, isPending: false }),
}))

vi.mock('../../hooks/useAuthorities', () => ({
  useAuthorityNames: () => new Map([['LOZENETS', 'Район Лозенец']]),
}))

const report: Alert = {
  id: 'r1',
  title: 'Дупка',
  description: 'Пред номер 12',
  categoryCode: 1007,
  latitude: 42.67,
  longitude: 23.32,
  createdAt: '2026-10-19T10:00:00Z',
  status: 'REJECTED',
  reportedBy: 'reporter',
  upvoteCount: 0,
  downvoteCount: 0,
  confirmationCount: 0,
  credibilityScore: 0,
  resolvedAt: null,
  districtCode: 'LOZENETS',
  authorityCode: 'LOZENETS',
  answerDueAt: null,
  closedBy: 'AUTHORITY',
  fixCheck: UNCHECKED_FIX,
}

const rejection: Rejection = {
  reason: 'Дублира сигнал от вчера',
  byModerator: false,
  authorityCode: 'LOZENETS',
  rejectedAt: '2026-10-19T11:00:00Z',
  disputeReason: null,
  disputedAt: null,
  decision: null,
  decidedAt: null,
}

const account = (id: string, role: User['role']): User => ({
  id, email: `${id}@example.com`, displayName: id, role, authorityCode: null, enabled: true, emailVerified: true,
})
const signIn = (u: User) => useAuthStore.setState({ user: u })

beforeEach(() => {
  disputeMutate.mockReset()
  decideMutate.mockReset()
  rejections = [rejection]
})
afterEach(cleanup)

describe('RejectionPanel', () => {
  it('says who rejected the report and why', () => {
    signIn(account('someone', 'USER'))
    render(<RejectionPanel alert={report} />)
    expect(screen.getByText(/Отхвърлен от Район Лозенец:/)).toBeInTheDocument()
    expect(screen.getByText(/Дублира сигнал от вчера/)).toBeInTheDocument()
    // Only the reporter disputes.
    expect(screen.queryByRole('button', { name: 'Оспори отхвърлянето' })).not.toBeInTheDocument()
  })

  it('lets the reporter dispute it, saying why', async () => {
    signIn(account('reporter', 'USER'))
    render(<RejectionPanel alert={report} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Оспори отхвърлянето' }))
    await user.type(screen.getByLabelText('Защо не сте съгласни'), 'Дупката още е там')
    await user.click(screen.getByRole('button', { name: 'Оспори' }))

    expect(disputeMutate).toHaveBeenCalledWith('Дупката още е там', expect.anything())
  })

  it('gives a moderator the two answers to a dispute, and the reporter only the wait', async () => {
    rejections = [{ ...rejection, disputeReason: 'Още е там', disputedAt: '2026-10-19T12:00:00Z' }]

    signIn(account('reporter', 'USER'))
    const { unmount } = render(<RejectionPanel alert={report} />)
    expect(screen.getByText('Оспорването чака решение на модератор.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Отвори отново' })).not.toBeInTheDocument()
    unmount()

    signIn(account('m1', 'MODERATOR'))
    render(<RejectionPanel alert={report} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Отвори отново' }))
    expect(decideMutate).toHaveBeenCalledWith('REOPENED')
  })

  /** Rejected before reasons were kept: nothing on record to show or to dispute. */
  it('shows nothing when there is no rejection on record', () => {
    rejections = []
    signIn(account('reporter', 'USER'))
    const { container } = render(<RejectionPanel alert={report} />)
    expect(container).toBeEmptyDOMElement()
  })
})
