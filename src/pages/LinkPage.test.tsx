import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LinkPage } from './LinkPage'
import { useAuthStore } from '../store/authStore'

function Where() {
  const { pathname, search } = useLocation()
  return <p>at {pathname}{search}</p>
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/link" element={<LinkPage />} />
        <Route path="/map" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )

afterEach(cleanup)

describe('LinkPage', () => {
  it('trades the key for a session and opens the report', async () => {
    const signInWithLink = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ signInWithLink })

    renderAt('/link?key=s3cr3t&alert=r1')

    expect(await screen.findByText('at /map?alert=r1')).toBeInTheDocument()
    expect(signInWithLink).toHaveBeenCalledWith('s3cr3t')
  })

  /** A dead link is not a dead end: the login page, aimed at the same report. */
  it('sends a key that no longer works to the login page', async () => {
    useAuthStore.setState({ signInWithLink: vi.fn().mockRejectedValue(new Error('401')) })

    renderAt('/link?key=old&alert=r1')

    expect(await screen.findByText('Линкът не е валиден или е изтекъл.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Към входа' })).toHaveAttribute('href', '/login')
  })

  it('says so when there is no key at all', async () => {
    const signInWithLink = vi.fn()
    useAuthStore.setState({ signInWithLink })

    renderAt('/link?alert=r1')

    expect(await screen.findByText('Линкът не е валиден или е изтекъл.')).toBeInTheDocument()
    expect(signInWithLink).not.toHaveBeenCalled()
  })
})
