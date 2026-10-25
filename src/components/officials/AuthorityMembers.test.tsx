import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthorityMembers } from './AuthorityMembers'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../types'

vi.mock('../../api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const lead: User = {
  id: 'lead', email: 'lozenets@rayon.nabat.test', displayName: 'Район Лозенец', role: 'OFFICIAL',
  authorityCode: 'LOZENETS', enabled: true, emailVerified: true,
}
const ivan: User = { ...lead, id: 'ivan', email: 'ivan@example.com', displayName: 'Иван Петров', emailVerified: false }

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AuthorityMembers />
    </QueryClientProvider>,
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AuthorityMembers', () => {
  it('lists the authority\'s staff and invites a colleague', async () => {
    useAuthStore.setState({ user: lead })
    vi.mocked(apiClient.get).mockResolvedValue({ data: [lead, ivan] })
    vi.mocked(apiClient.post).mockResolvedValue({ data: ivan })
    renderIt()

    expect(await screen.findByText('Иван Петров')).toBeInTheDocument()
    expect(screen.getByText('поканен')).toBeInTheDocument()
    // The authority's own account is not removed.
    expect(screen.getAllByRole('button', { name: 'Премахни' })).toHaveLength(1)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Име'), 'Мария')
    await user.type(screen.getByLabelText('Имейл'), 'maria@example.com')
    await user.click(screen.getByRole('button', { name: 'Покани' }))

    expect(apiClient.post).toHaveBeenCalledWith('/authority/members', { email: 'maria@example.com', displayName: 'Мария' })
  })

  /** Only the authority's own account manages staff; the server says so with a 403. */
  it('shows nothing to anyone else', async () => {
    useAuthStore.setState({ user: ivan })
    vi.mocked(apiClient.get).mockRejectedValue(new Error('403'))
    const { container } = renderIt()

    await new Promise((r) => setTimeout(r, 0))
    expect(container).toBeEmptyDOMElement()
  })
})
