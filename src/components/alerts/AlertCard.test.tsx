import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertCard } from './AlertCard'
import { useAlertStore } from '../../store/alertStore'
import type { Alert } from '../../types'

const baseAlert: Alert = {
  id: 'alert-1',
  title: 'Fire on Main St',
  description: 'A fire broke out near the intersection',
  type: 'FIRE',
  severity: 'HIGH',
  latitude: 42.7,
  longitude: 23.3,
  createdAt: new Date().toISOString(),
  status: 'ACTIVE',
  reportedBy: 'user-1',
  upvoteCount: 5,
  downvoteCount: 1,
  confirmationCount: 3,
  resolvedAt: null,
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
  it('renders the alert title and type', () => {
    render(<AlertCard alert={baseAlert} />)
    expect(screen.getByText('Fire on Main St')).toBeInTheDocument()
    expect(screen.getByText('Fire')).toBeInTheDocument()
  })

  it('renders the severity badge', () => {
    render(<AlertCard alert={baseAlert} />)
    expect(screen.getByText('HIGH')).toBeInTheDocument()
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
