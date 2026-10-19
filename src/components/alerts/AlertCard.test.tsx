import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render as rtlRender, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { AlertCard } from './AlertCard'
import { useAlertStore } from '../../store/alertStore'
import type { Alert } from '../../types'
import { UNCHECKED_FIX } from '../../types'
import { queryClientWithCategories } from '../../test/categories'

const render = (ui: ReactElement) =>
  rtlRender(<QueryClientProvider client={queryClientWithCategories()}>{ui}</QueryClientProvider>)

const baseAlert: Alert = {
  id: 'alert-1',
  title: 'Fire on Main St',
  description: 'A fire broke out near the intersection',
  categoryCode: 1007,
  latitude: 42.7,
  longitude: 23.3,
  createdAt: new Date().toISOString(),
  status: 'SUBMITTED',
  reportedBy: 'user-1',
  upvoteCount: 5,
  downvoteCount: 1,
  confirmationCount: 3,
  // 5 - 1 + 3*2, as the voting service would compute it. Supplied by the API rather
  // than derived client-side.
  credibilityScore: 10,
  resolvedAt: null,
  districtCode: 'LOZENETS',
  authorityCode: 'LOZENETS',
  answerDueAt: null,
  closedBy: null,
  fixCheck: UNCHECKED_FIX,
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

afterEach(cleanup)

describe('AlertCard', () => {
  it('renders the alert title and its subcategory', () => {
    render(<AlertCard alert={baseAlert} />)
    expect(screen.getByText('Fire on Main St')).toBeInTheDocument()
    expect(screen.getByText('Улично платно')).toBeInTheDocument()
  })

  /** The catalogue is fetched once per session; a card drawn before it arrives must not break. */
  it('renders without a category name while the catalogue has not loaded', () => {
    rtlRender(
      <QueryClientProvider client={queryClientWithCategories()}>
        <AlertCard alert={{ ...baseAlert, categoryCode: 9999 }} />
      </QueryClientProvider>,
    )
    expect(screen.getByText('Fire on Main St')).toBeInTheDocument()
    expect(screen.queryByText('Улично платно')).not.toBeInTheDocument()
  })

  it('says how far the report has got', () => {
    render(<AlertCard alert={{ ...baseAlert, status: 'SENT' }} />)
    expect(screen.getByText('Изпратен до района')).toBeInTheDocument()
  })

  it('calls selectAlert on click', async () => {
    const user = userEvent.setup()
    render(<AlertCard alert={baseAlert} />)
    await user.click(screen.getByRole('button'))
    expect(useAlertStore.getState().selectedAlertId).toBe('alert-1')
  })

  it('deselects on second click', async () => {
    useAlertStore.getState().selectAlert(baseAlert.id)
    const user = userEvent.setup()
    render(<AlertCard alert={baseAlert} />)
    await user.click(screen.getByRole('button'))
    expect(useAlertStore.getState().selectedAlertId).toBeNull()
  })
})
