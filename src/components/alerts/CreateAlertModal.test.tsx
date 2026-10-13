import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { CreateAlertModal } from './CreateAlertModal'
import { useAlertStore } from '../../store/alertStore'
import { alertsApi } from '../../api/alerts'
import { queryClientWithCategories } from '../../test/categories'

vi.mock('../../api/alerts', () => ({ alertsApi: { create: vi.fn() } }))

const create = vi.mocked(alertsApi.create)

function renderModal() {
  const onClose = vi.fn()
  const qc = queryClientWithCategories()
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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CreateAlertModal', () => {
  it('renders the modal with title', () => {
    renderModal()
    expect(screen.getByText('Подай сигнал')).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: /изпрати сигнала/i }))
    await waitFor(() => {
      expect(screen.getByText('Заглавието е задължително')).toBeInTheDocument()
      expect(screen.getByText('Описанието е задължително')).toBeInTheDocument()
      // No category is chosen for the reporter: a default would be filed as if they had.
      expect(screen.getByText('Изберете категория')).toBeInTheDocument()
    })
    expect(create).not.toHaveBeenCalled()
  })

  /** Group first, then subcategory — and what is sent is the subcategory's code. */
  it('files the report under the subcategory chosen in two steps', async () => {
    const user = userEvent.setup()
    create.mockResolvedValue({} as never)
    const { onClose } = renderModal()

    await user.type(screen.getByLabelText(/заглавие/i), 'Дупка')
    await user.type(screen.getByPlaceholderText(/опишете проблема/i), 'Дълбока, в дясното платно')
    await user.click(screen.getByRole('listitem', { name: 'Пътища и шахти' }))
    expect(screen.getByText('счупени плочки, бордюри')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Улично платно/ }))
    expect(screen.getByRole('radio', { name: /Улично платно/ })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: /изпрати сигнала/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ categoryCode: 1007, title: 'Дупка' }))
  })

  it('goes back from a group to all groups', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('listitem', { name: 'Автомобили' }))
    await user.click(screen.getByRole('button', { name: /всички групи/i }))

    expect(screen.getByRole('listitem', { name: 'Пътища и шахти' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
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
    await user.click(screen.getByText('Отказ'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('updates title input', async () => {
    const user = userEvent.setup()
    renderModal()
    const input = screen.getByLabelText(/заглавие/i)
    await user.type(input, 'My Alert')
    expect(input).toHaveValue('My Alert')
  })
})
