import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AlertSidebar } from './AlertSidebar'
import { useAlertStore } from '../../store/alertStore'
import { DESKTOP_QUERY } from '../../hooks/useMediaQuery'

/**
 * These cover the half of the responsive behaviour that is *not* CSS.
 *
 * Which edge the panel slides from is a Tailwind breakpoint and needs no test — the
 * stylesheet cannot disagree with itself. Whether it starts open, and whether opening an
 * alert gets it out of the way, are decisions in JavaScript, and both are invisible on a
 * desktop: a regression here would only show up on a phone, which is exactly where nobody
 * is running the test suite.
 */
function mockViewport({ desktop }: { desktop: boolean }) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    // Only the desktop query is asked about; anything else answers false rather than
    // silently matching, so a new query added later fails loudly instead of inheriting
    // whatever this happened to return.
    matches: query === DESKTOP_QUERY ? desktop : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

function renderSidebar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AlertSidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useAlertStore.setState({
    selectedAlertId: null,
    mapCenter: [42.6977, 23.3219],
    mapZoom: 13,
    radiusKm: 5,
    userLat: null,
    userLng: null,
    locationAccuracy: null,
    followUser: true,
    wsConnected: false,
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/**
 * Both toggles are always in the DOM — which one is visible is a Tailwind `hidden md:flex`,
 * and jsdom loads no stylesheet — so queries here go by accessible name, never by role
 * alone. A `getByRole('button', { expanded: false })` matches both and throws.
 */
const sheetHandle = () => screen.getByRole('button', { name: /alerts? nearby/i })
const edgeToggle = () => screen.getByRole('button', { name: /(collapse|expand) alert list/i })

describe('AlertSidebar', () => {
  it('starts collapsed on a phone, where the sheet would otherwise cover the map', () => {
    mockViewport({ desktop: false })
    renderSidebar()

    expect(sheetHandle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('starts open on a desktop, where the panel and the map both fit', () => {
    mockViewport({ desktop: true })
    renderSidebar()

    expect(edgeToggle()).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapses when an alert is selected on a phone — both sheets want the same space', async () => {
    mockViewport({ desktop: false })
    renderSidebar()

    // Open it first, otherwise this passes on the initial state and proves nothing.
    await userEvent.click(sheetHandle())
    expect(sheetHandle()).toHaveAttribute('aria-expanded', 'true')

    useAlertStore.setState({ selectedAlertId: 'alert-1' })

    await waitFor(() => {
      expect(sheetHandle()).toHaveAttribute('aria-expanded', 'false')
    })
  })

  it('keeps the panel open when an alert is selected on a desktop', async () => {
    mockViewport({ desktop: true })
    renderSidebar()
    useAlertStore.setState({ selectedAlertId: 'alert-1' })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /collapse alert list/i })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
    })
  })
})
