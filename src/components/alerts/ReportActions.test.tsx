import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportActions } from './ReportActions'
import { useAuthStore } from '../../store/authStore'
import type { Alert, User } from '../../types'
import { UNCHECKED_FIX } from '../../types'

const actionMutate = vi.fn()
const resolveMutate = vi.fn()
const forwardMutate = vi.fn()
const rejectMutate = vi.fn()
const withdrawMutate = vi.fn()

vi.mock('../../hooks/useAlerts', () => ({
  useReportAction: () => ({ mutate: actionMutate, isPending: false, variables: undefined }),
  useResolveAlert: () => ({ mutate: resolveMutate, isPending: false }),
}))

vi.mock('../../hooks/useForwards', () => ({
  useForwardReport: () => ({ mutate: forwardMutate, isPending: false }),
}))

vi.mock('../../hooks/useRejections', () => ({
  useRejectReport: () => ({ mutate: rejectMutate, isPending: false }),
  useWithdrawReport: () => ({ mutate: withdrawMutate, isPending: false }),
}))

vi.mock('../../hooks/useAuthorities', () => ({
  useAuthorities: () => ({
    data: [
      { code: 'LOZENETS', name: 'Район Лозенец', kind: 'DISTRICT' },
      { code: 'CGM', name: 'Център за градска мобилност', kind: 'INSTITUTION' },
    ],
  }),
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
  authorityCode: 'LOZENETS',
  answerDueAt: null,
  closedBy: null,
  fixCheck: UNCHECKED_FIX,
}

const account = (id: string, role: User['role'], authorityCode: string | null = null): User => ({
  id, email: `${id}@example.com`, displayName: id, role, authorityCode, enabled: true, emailVerified: true,
})

const signIn = (u: User) => useAuthStore.setState({ user: u })
const labels = () => screen.queryAllByRole('button').map((b) => b.textContent)

beforeEach(() => {
  actionMutate.mockReset()
  resolveMutate.mockReset()
  forwardMutate.mockReset()
  rejectMutate.mockReset()
  withdrawMutate.mockReset()
})
afterEach(cleanup)

describe('ReportActions', () => {
  it('gives the report\'s own district every step it can still take', () => {
    signIn(account('o1', 'OFFICIAL', 'LOZENETS'))
    render(<ReportActions alert={report} />)
    expect(labels()).toEqual(['Приеми', 'Започни работа', 'Маркирай като решен', 'Отхвърли', 'Не е наше — препрати'])
  })

  it('stops offering a step the report is already past', () => {
    signIn(account('o1', 'OFFICIAL', 'LOZENETS'))
    render(<ReportActions alert={{ ...report, status: 'IN_PROGRESS' }} />)
    expect(labels()).toEqual(['Маркирай като решен', 'Отхвърли', 'Не е наше — препрати'])
  })

  /** Nothing at all, not a set of buttons that would each answer 403. */
  it('shows an official of another district nothing', () => {
    signIn(account('o2', 'OFFICIAL', 'TRIADITSA'))
    const { container } = render(<ReportActions alert={report} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lets the reporter mark their own report fixed, and nothing more', () => {
    signIn(account('reporter', 'USER'))
    render(<ReportActions alert={report} />)
    expect(labels()).toEqual(['Маркирай като решен', 'Оттегли сигнала'])
  })

  it('sends the step that was clicked', async () => {
    signIn(account('o1', 'OFFICIAL', 'LOZENETS'))
    render(<ReportActions alert={report} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Започни работа' }))
    expect(actionMutate).toHaveBeenCalledWith('startWork')
    expect(resolveMutate).not.toHaveBeenCalled()
  })

  /** Not the reporter: they chose the category, which chose the authority. */
  it('offers forwarding to the authority, and sends where and why', async () => {
    signIn(account('o1', 'OFFICIAL', 'LOZENETS'))
    render(<ReportActions alert={report} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Не е наше — препрати' }))

    // Its own authority is not offered.
    expect(screen.queryByRole('option', { name: 'Район Лозенец' })).not.toBeInTheDocument()
    const submit = screen.getByRole('button', { name: 'Препрати' })
    expect(submit).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Към кого'), 'CGM')
    await user.type(screen.getByLabelText('Защо е тяхно'), 'Знакът е на ЦГМ')
    await user.click(submit)

    expect(forwardMutate).toHaveBeenCalledWith(
      { authorityCode: 'CGM', reason: 'Знакът е на ЦГМ' }, expect.anything())
  })

  /** Final, and it locks the thread: never one click, and never without a reason. */
  it('asks why before rejecting, and sends the reason', async () => {
    signIn(account('o1', 'OFFICIAL', 'LOZENETS'))
    render(<ReportActions alert={report} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Отхвърли' }))
    expect(rejectMutate).not.toHaveBeenCalled()

    const submit = screen.getAllByRole('button', { name: 'Отхвърли' }).at(-1) as HTMLElement
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Защо се отхвърля'), 'Дублира сигнал от вчера')
    await user.click(submit)

    expect(rejectMutate).toHaveBeenCalledWith('Дублира сигнал от вчера', expect.anything())
    expect(actionMutate).not.toHaveBeenCalled()
  })

  /** The reporter's way out that is not a false "fixed", with a reason. */
  it('lets the reporter withdraw their report, saying why', async () => {
    signIn(account('reporter', 'USER'))
    render(<ReportActions alert={report} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Оттегли сигнала' }))
    await user.type(screen.getByLabelText('Защо го оттегляте'), 'Сгреших мястото')
    await user.click(screen.getByRole('button', { name: 'Оттегли' }))

    expect(withdrawMutate).toHaveBeenCalledWith('Сгреших мястото', expect.anything())
    expect(resolveMutate).not.toHaveBeenCalled()
  })

  it('shows nothing on a closed report', () => {
    signIn(account('o1', 'OFFICIAL', 'LOZENETS'))
    const { container } = render(<ReportActions alert={{ ...report, status: 'RESOLVED' }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
