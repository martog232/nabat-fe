import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FixCheckPanel } from './FixCheckPanel'
import { FixOutcomeBadge } from './FixOutcomeBadge'
import { useAuthStore } from '../../store/authStore'
import type { Alert, FixCheckResponse, User } from '../../types'
import { UNCHECKED_FIX } from '../../types'

const answerMutate = vi.fn()
let fixCheckData: FixCheckResponse | undefined
const fixCheckEnabled = vi.fn()

vi.mock('../../hooks/useFixCheck', () => ({
  useFixCheck: (_id: string, enabled: boolean) => {
    fixCheckEnabled(enabled)
    return { data: enabled ? fixCheckData : undefined }
  },
  useAnswerFixCheck: () => ({ mutate: answerMutate, isPending: false }),
}))

const resolved: Alert = {
  id: 'r1',
  title: 'Дупка',
  description: 'Пред номер 12',
  categoryCode: 1007,
  latitude: 42.67,
  longitude: 23.32,
  createdAt: '2026-09-28T10:00:00Z',
  status: 'RESOLVED',
  reportedBy: 'reporter',
  upvoteCount: 0,
  downvoteCount: 0,
  confirmationCount: 0,
  credibilityScore: 0,
  resolvedAt: '2026-10-01T10:00:00Z',
  districtCode: 'LOZENETS',
  authorityCode: 'LOZENETS',
  answerDueAt: null,
  closedBy: 'AUTHORITY',
  fixCheck: UNCHECKED_FIX,
}

const account = (id: string, role: User['role'], authorityCode: string | null = null): User => ({
  id, email: `${id}@example.com`, displayName: id, role, authorityCode, enabled: true, emailVerified: true,
})

const signIn = (u: User | null) => useAuthStore.setState({ user: u })
const answers = () => screen.queryAllByRole('button')

beforeEach(() => {
  answerMutate.mockReset()
  fixCheckEnabled.mockReset()
  fixCheckData = { summary: { ...UNCHECKED_FIX }, mine: null }
})
afterEach(cleanup)

describe('FixCheckPanel', () => {
  it('shows nothing on a report that is not resolved', () => {
    signIn(account('u1', 'USER'))
    const { container } = render(<FixCheckPanel alert={{ ...resolved, status: 'IN_PROGRESS', closedBy: null }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('asks the question with three answers', () => {
    signIn(account('u1', 'USER'))
    render(<FixCheckPanel alert={resolved} />)
    expect(screen.getByText('Наистина ли е оправено?')).toBeInTheDocument()
    expect(answers().map((b) => b.textContent)).toEqual(['Оправено е', 'Частично', 'Не е оправено'])
  })

  it('marks the answer already given', () => {
    signIn(account('u1', 'USER'))
    fixCheckData = { summary: { ...UNCHECKED_FIX, notFixed: 1, outcome: 'DISPUTED' }, mine: 'NOT_FIXED' }
    render(<FixCheckPanel alert={resolved} />)
    expect(screen.getByRole('button', { name: /Не е оправено/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Оправено е/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('sends the answer that was clicked', async () => {
    signIn(account('u1', 'USER'))
    render(<FixCheckPanel alert={resolved} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Не е оправено/ }))
    expect(answerMutate).toHaveBeenCalledWith('NOT_FIXED')
  })

  it('takes the answer back on a second click', async () => {
    signIn(account('u1', 'USER'))
    fixCheckData = { summary: { ...UNCHECKED_FIX, fixed: 1, outcome: 'CONFIRMED' }, mine: 'FIXED' }
    render(<FixCheckPanel alert={resolved} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Оправено е/ }))
    expect(answerMutate).toHaveBeenCalledWith(null)
  })

  it('shows the tally and what it adds up to', () => {
    signIn(account('u1', 'USER'))
    fixCheckData = {
      summary: { fixed: 3, partly: 1, notFixed: 2, reporterVerdict: 'NOT_FIXED', outcome: 'DISPUTED' },
      mine: null,
    }
    render(<FixCheckPanel alert={resolved} />)
    expect(screen.getByText('3 казват оправено · 1 частично · 2 не')).toBeInTheDocument()
    expect(screen.getByText('Оспорен — не е оправен')).toBeInTheDocument()
    expect(screen.getByText('Не е оправено', { selector: 'span' })).toBeInTheDocument()
  })

  it('tells the reporter their answer weighs most', () => {
    signIn(account('reporter', 'USER'))
    render(<FixCheckPanel alert={resolved} />)
    expect(screen.getByText('Вие подадохте сигнала — вашият отговор тежи най-много.')).toBeInTheDocument()
  })

  /** The server refuses them; offering buttons that each answer 403 would be worse than none. */
  it('does not let the report\'s own district check its own work', () => {
    signIn(account('o1', 'OFFICIAL', 'LOZENETS'))
    render(<FixCheckPanel alert={resolved} />)
    expect(answers()).toHaveLength(0)
    expect(screen.getByText('Отговорната институция не може да проверява собствената си работа.')).toBeInTheDocument()
    expect(fixCheckEnabled).toHaveBeenLastCalledWith(false)
  })

  it('lets an official of another district answer like anyone else', () => {
    signIn(account('o2', 'OFFICIAL', 'TRIADITSA'))
    render(<FixCheckPanel alert={resolved} />)
    expect(answers()).toHaveLength(3)
  })

  it('asks a signed-out reader to sign in, and shows the tally from the report', () => {
    signIn(null)
    render(<FixCheckPanel alert={{ ...resolved, fixCheck: { fixed: 2, partly: 0, notFixed: 0, reporterVerdict: null, outcome: 'CONFIRMED' } }} />)
    expect(answers()).toHaveLength(0)
    expect(screen.getByText(/за да кажете дали е оправено/)).toBeInTheDocument()
    expect(screen.getByText('2 казват оправено · 0 частично · 0 не')).toBeInTheDocument()
  })
})

describe('FixOutcomeBadge', () => {
  it('says nothing about a report nobody has checked', () => {
    const { container } = render(<FixOutcomeBadge alert={resolved} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('flags a resolved report people say is not fixed', () => {
    render(<FixOutcomeBadge alert={{ ...resolved, fixCheck: { fixed: 0, partly: 0, notFixed: 2, reporterVerdict: null, outcome: 'DISPUTED' } }} />)
    expect(screen.getByText('Оспорен — не е оправен')).toBeInTheDocument()
  })

  it('confirms one everybody says is fixed', () => {
    render(<FixOutcomeBadge alert={{ ...resolved, fixCheck: { fixed: 2, partly: 0, notFixed: 0, reporterVerdict: 'FIXED', outcome: 'CONFIRMED' } }} />)
    expect(screen.getByText('Потвърдено оправен')).toBeInTheDocument()
  })

  it('says nothing on an open report', () => {
    const { container } = render(
      <FixOutcomeBadge alert={{ ...resolved, status: 'SENT', fixCheck: { fixed: 0, partly: 0, notFixed: 1, reporterVerdict: null, outcome: 'DISPUTED' } }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
