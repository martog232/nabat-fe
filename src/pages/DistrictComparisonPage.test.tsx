import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DistrictComparisonPage } from './DistrictComparisonPage'
import { districtComparisonApi } from '../api/districtComparison'
import { districtsApi } from '../api/districts'
import { useAuthStore } from '../store/authStore'
import type { DistrictComparison, DistrictOutcomes } from '../types'

vi.mock('../api/districtComparison', () => ({ districtComparisonApi: { get: vi.fn() } }))
vi.mock('../api/districts', () => ({ districtsApi: { list: vi.fn() } }))
// jsdom has no layout, so ApexCharts cannot draw there; what is checked is what the page asks it to draw.
vi.mock('react-apexcharts', () => ({
  default: (props: { type: string; series: unknown }) => (
    <div data-testid="chart" data-type={props.type} data-series={JSON.stringify(props.series)} />
  ),
}))

const comparison = vi.mocked(districtComparisonApi.get)
const districts = vi.mocked(districtsApi.list)

const outcomes = (over: Partial<DistrictOutcomes>): DistrictOutcomes => ({
  districtCode: 'LOZENETS',
  signals: 100,
  answered: 90,
  medianDaysToAnswer: 12.4,
  p90DaysToAnswer: 41,
  dueIn30Days: 80,
  answeredIn30Days: 60,
  closed: 20,
  answeredOnly: 60,
  rejected: 10,
  stillOpen: 10,
  ...over,
})

const answer = (over: Partial<DistrictComparison> = {}): DistrictComparison => ({
  archiveFrom: '2021-12-14',
  archiveTo: '2026-08-01',
  from: '2025-08-02',
  to: '2026-08-02',
  districts: [
    outcomes({}),
    outcomes({ districtCode: 'MLADOST', signals: 50, dueIn30Days: 40, answeredIn30Days: 10, medianDaysToAnswer: 30 }),
  ],
  ...over,
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DistrictComparisonPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The district names in the table body, in the order shown. */
const order = () => screen.getAllByRole('rowheader').map((h) => h.textContent)

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null })
  districts.mockResolvedValue([
    { code: 'LOZENETS', name: 'Район Лозенец', population: 50_000 },
    { code: 'MLADOST', name: 'Район Младост', population: 100_000 },
    { code: 'BANKYA', name: 'Район Банкя', population: 10_000 },
  ])
  comparison.mockResolvedValue(answer())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DistrictComparisonPage', () => {
  it('works out per-resident figures and shares for every district', async () => {
    renderPage()

    const lozenets = (await screen.findByRole('rowheader', { name: 'Лозенец' })).closest('tr')!
    const cells = within(lozenets).getAllByRole('cell').map((c) => c.textContent)
    // signals, per 1000, median, p90, within 30, closed, answered only, rejected, no answer
    expect(cells).toEqual(['100', '2', '12,4', '41', '75%', '20%', '60%', '10%', '10%'])
  })

  it('shows a dash where the deadline cannot be judged, and keeps districts with no reports', async () => {
    comparison.mockResolvedValue(answer({ districts: [outcomes({ dueIn30Days: 0, answeredIn30Days: 0 })] }))
    renderPage()

    const lozenets = (await screen.findByRole('rowheader', { name: 'Лозенец' })).closest('tr')!
    expect(within(lozenets).getAllByRole('cell')[4]).toHaveTextContent('—')
    const bankya = screen.getByRole('rowheader', { name: 'Банкя' }).closest('tr')!
    expect(within(bankya).getAllByRole('cell')[0]).toHaveTextContent('0')
  })

  it('puts the worst 30-day share first, and sorts by a column on click', async () => {
    renderPage()
    await screen.findByRole('rowheader', { name: 'Младост' })

    // Младост 25%, Лозенец 75%, Банкя has none — last whichever way.
    expect(order()).toEqual(['Младост', 'Лозенец', 'Банкя'])

    // Банкя has no reports in the period: zero, a value, so it sorts like one.
    await userEvent.click(screen.getByRole('button', { name: /^Сигнали/ }))
    expect(order()).toEqual(['Банкя', 'Младост', 'Лозенец'])
    await userEvent.click(screen.getByRole('button', { name: /^Сигнали/ }))
    expect(order()).toEqual(['Лозенец', 'Младост', 'Банкя'])
  })

  it('asks for a calendar year when one is chosen', async () => {
    renderPage()
    await screen.findByRole('rowheader', { name: 'Лозенец' })

    await userEvent.selectOptions(screen.getByLabelText('Период'), '2024')

    await waitFor(() => expect(comparison).toHaveBeenLastCalledWith({ from: '2024-01-01', to: '2025-01-01' }))
    expect(screen.getByRole('option', { name: /2026 \(до/ })).toBeInTheDocument()
  })

  it('says so when no archive has been imported', async () => {
    comparison.mockResolvedValue({ archiveFrom: null, archiveTo: null, from: null, to: null, districts: [] })
    renderPage()

    expect(await screen.findByText(/още не е внесен/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('DistrictComparisonPage — charts', () => {
  it('draws the deadline, the answer times and the endings', async () => {
    renderPage()

    const charts = await screen.findAllByTestId('chart')
    expect(charts.map((c) => c.dataset.type)).toEqual(['bar', 'rangeBar', 'bar'])
    expect(screen.getByRole('heading', { name: 'Отговорени до 30 дни' })).toBeInTheDocument()
    // Лозенец 75% before Младост 25%; Банкя has no reports and no bar.
    expect(JSON.parse(charts[0].dataset.series!)).toEqual([{ name: 'Отговорени до 30 дни', data: [75, 25] }])
  })
})
