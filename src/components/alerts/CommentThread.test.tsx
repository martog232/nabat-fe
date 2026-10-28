import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CommentThread } from './CommentThread'
import { useAuthStore } from '../../store/authStore'
import type { Alert, Comment, User } from '../../types'
import { UNCHECKED_FIX } from '../../types'

const addMutate = vi.fn()
const removeMutate = vi.fn()
let thread: Comment[] = []

vi.mock('../../hooks/useComments', () => ({
  useComments: (_id: string, enabled: boolean) => ({ data: enabled ? thread : undefined, isLoading: false, isError: false }),
  useAddComment: () => ({ mutate: addMutate, isPending: false }),
  useRemoveComment: () => ({ mutate: removeMutate, isPending: false }),
}))

vi.mock('../../hooks/useAuthorities', () => ({
  useAuthorityNames: () => new Map([['LOZENETS', 'Район Лозенец']]),
}))

const report: Alert = {
  id: 'a1',
  title: 'Дупка',
  description: 'Пред номер 12',
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

const comment = (over: Partial<Comment>): Comment => ({
  id: 'c1',
  authorName: 'Мария',
  byAuthority: false,
  byReporter: false,
  mine: false,
  body: 'Още е там.',
  createdAt: '2026-10-14T10:00:00Z',
  removedBy: null,
  ...over,
})

const account = (role: User['role']): User => ({
  id: 'me', email: 'me@example.com', displayName: 'Аз', role, authorityCode: null, enabled: true, emailVerified: true,
})

const signIn = (u: User | null) => useAuthStore.setState({ user: u })

beforeEach(() => {
  addMutate.mockReset()
  removeMutate.mockReset()
  thread = []
})
afterEach(cleanup)

describe('CommentThread', () => {
  it('shows who wrote what, marking the district and the reporter', () => {
    signIn(account('USER'))
    thread = [
      comment({ id: 'c1', authorName: 'Служител', byAuthority: true, body: 'Насочено към поддръжката.' }),
      comment({ id: 'c2', authorName: 'Иван', byReporter: true, body: 'Благодаря.' }),
    ]
    render(<CommentThread alert={report} />)

    expect(screen.getByRole('heading', { name: 'Коментари (2)' })).toBeInTheDocument()
    expect(screen.getByText('Район Лозенец')).toBeInTheDocument()
    expect(screen.getByText('Подател')).toBeInTheDocument()
    expect(screen.getByText('Насочено към поддръжката.')).toBeInTheDocument()
  })

  it('posts what is typed, trimmed', async () => {
    signIn(account('USER'))
    render(<CommentThread alert={report} />)

    await userEvent.type(screen.getByLabelText('Вашият коментар'), '  Снимка от днес.  ')
    await userEvent.click(screen.getByRole('button', { name: 'Публикувай' }))

    expect(addMutate).toHaveBeenCalledWith('Снимка от днес.', expect.anything())
  })

  it('does not post an empty comment', () => {
    signIn(account('USER'))
    render(<CommentThread alert={report} />)

    expect(screen.getByRole('button', { name: 'Публикувай' })).toBeDisabled()
  })

  it('locks a resolved report, keeps its thread, and points at "is it really fixed?"', () => {
    signIn(account('USER'))
    thread = [comment({ mine: true })]
    render(<CommentThread alert={{ ...report, status: 'RESOLVED', closedBy: 'AUTHORITY' }} />)

    expect(screen.getByText('Още е там.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Вашият коментар')).not.toBeInTheDocument()
    expect(screen.getByText(/коментарите са заключени/)).toBeInTheDocument()
    // Its author cannot take it back from a closed thread.
    expect(screen.queryByRole('button', { name: /Премахни/ })).not.toBeInTheDocument()
  })

  it('lets an author take their own comment down while the report is open, and nobody else\'s', async () => {
    signIn(account('USER'))
    thread = [comment({ id: 'mine', mine: true, authorName: 'Аз' }), comment({ id: 'theirs', authorName: 'Мария' })]
    render(<CommentThread alert={report} />)

    const buttons = screen.getAllByRole('button', { name: /Премахни/ })
    expect(buttons).toHaveLength(1)
    await userEvent.click(buttons[0])
    expect(removeMutate).toHaveBeenCalledWith('mine')
  })

  it('lets a moderator take any comment down, even in a closed thread', () => {
    signIn(account('MODERATOR'))
    thread = [comment({ authorName: 'Мария' })]
    render(<CommentThread alert={{ ...report, status: 'REJECTED', closedBy: 'MODERATOR' }} />)

    expect(screen.getByRole('button', { name: 'Премахни коментара на Мария' })).toBeInTheDocument()
  })

  it('says who took a comment down instead of what it said', () => {
    signIn(account('USER'))
    thread = [comment({ body: null, removedBy: 'MODERATOR' })]
    render(<CommentThread alert={report} />)

    expect(screen.getByText('Коментарът е премахнат от модератор.')).toBeInTheDocument()
  })

  it('shows the thread to someone signed out, and offers a way in to write', () => {
    signIn(null)
    thread = [comment({})]
    render(<MemoryRouter><CommentThread alert={report} /></MemoryRouter>)

    expect(screen.getByText('Още е там.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Влезте' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
