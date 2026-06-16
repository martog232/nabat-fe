import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateAlertModal } from './CreateAlertModal'
import { useAlertStore } from '../../store/alertStore'

function renderModal() {
  const onClose = vi.fn()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    onClose,
    ...render(
      <QueryClientProvider client={qc}>
        <CreateAlertModal onClose={onClose} />
      </QueryClientProvider>,
    ),
  }
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

describe('CreateAlertModal', () => {
  it('renders the modal with title', () => {
    renderModal()
    expect(screen.getByText('Report Incident')).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: /report incident/i }))
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
    })
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Cancel button click', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('updates title input', async () => {
    const user = userEvent.setup()
    renderModal()
    const input = screen.getByLabelText(/title/i)
    await user.type(input, 'My Alert')
    expect(input).toHaveValue('My Alert')
  })
})
