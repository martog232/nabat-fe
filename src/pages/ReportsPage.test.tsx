import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReportsPage } from './ReportsPage'
import { alertsApi } from '../api/alerts'
import { districtsApi } from '../api/districts'
import { categoriesApi } from '../api/categories'
import { useAuthStore } from '../store/authStore'
import type { Alert } from '../types'
import { TEST_CATEGORIES } from '../test/categories'

vi.mock('../api/alerts', () => ({ alertsApi: { listRanked: vi.fn() } }))
vi.mock('../api/districts', () => ({ districtsApi: { list: vi.fn() } }))
vi.mock('../api/categories', () => ({ categoriesApi: { list: vi.fn() } }))

const ranked = vi.mocked(alertsApi.listRanked)
const districts = vi.mocked(districtsApi.list)
const categories = vi.mocked(categoriesApi.list)

const report = (over: Partial<Alert>): Alert => ({
  id: 'r1',
  title: 'Pothole on Cherni Vrah',
  description: 'Deep, in the right lane',
  categoryCode: 1007,
  latitude: 42.67,
  longitude: 23.32,
  createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  status: 'SENT',
  reportedBy: 'someone',
  upvoteCount: 2,
  downvoteCount: 0,
  confirmationCount: 4,
  credibilityScore: 0,
  resolvedAt: null,
  districtCode: 'LOZENETS',
  closedBy: null,
  ...over,
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null })
  districts.mockResolvedValue([{ code: 'LOZENETS', name: 'Район Лозенец' }])
  categories.mockResolvedValue(TEST_CATEGORIES)
  ranked.mockResolvedValue({ alerts: [report({})], ranking: 'HOT', page: 0, size: 25, total: 1 })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ReportsPage', () => {
  /** The page is for everyone: nobody is signed in here, and it still lists what was reported. */
  it('lists reports for a visitor who is not signed in', async () => {
    renderPage()

    expect(await screen.findByText('Pothole on Cherni Vrah')).toBeInTheDocument()
    // Where it went, how long it has waited, and how many people back it — support is
    // confirmations plus upvotes minus downvotes, the same figure the HOT order ranks by.
    expect(await screen.findByText('Улично платно · Район Лозенец · чака 3 дни · подкрепа: 6')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Вход, за да подадете сигнал' })).toBeInTheDocument()
  })

  it('asks for open reports in HOT order by default', async () => {
    renderPage()
    await screen.findByText('Pothole on Cherni Vrah')

    expect(ranked).toHaveBeenCalledWith(expect.objectContaining({
      ranking: 'HOT',
      statuses: ['SUBMITTED', 'SENT', 'ACKNOWLEDGED', 'IN_PROGRESS'],
      page: 0,
    }))
  })

  it('asks again for the order and district that were chosen', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Pothole on Cherni Vrah')

    await user.click(screen.getByRole('tab', { name: 'Чакат най-дълго' }))
    await user.selectOptions(screen.getByLabelText('Район'), 'LOZENETS')

    await waitFor(() => expect(ranked).toHaveBeenLastCalledWith(expect.objectContaining({
      ranking: 'LONGEST_WAITING',
      district: 'LOZENETS',
    })))
  })

  /** "Resolved" alone is half the story; who said so is the other half. */
  it('says who closed a closed report', async () => {
    ranked.mockResolvedValue({
      alerts: [report({ status: 'RESOLVED', closedBy: 'DISTRICT', resolvedAt: new Date().toISOString() })],
      ranking: 'HOT', page: 0, size: 25, total: 1,
    })
    renderPage()

    expect(await screen.findByText(/затворен от района/)).toBeInTheDocument()
  })
})
