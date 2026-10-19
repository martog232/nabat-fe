import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { CreateAlertModal } from './CreateAlertModal'
import { useAlertStore } from '../../store/alertStore'
import { alertsApi } from '../../api/alerts'
import { queryClientWithCategories } from '../../test/categories'
import { votesApi } from '../../api/votes'
import type { Alert, SimilarReportsResponse } from '../../types'
import { UNCHECKED_FIX } from '../../types'

vi.mock('../../api/alerts', () => ({ alertsApi: { create: vi.fn(), similar: vi.fn() } }))
vi.mock('../../api/votes', () => ({ votesApi: { vote: vi.fn() } }))

const create = vi.mocked(alertsApi.create)
const similar = vi.mocked(alertsApi.similar)
const vote = vi.mocked(votesApi.vote)

const NO_MATCHES: SimilarReportsResponse = { radiusMeters: 100, reports: [], callSofia: [] }

const existing: Alert = {
  id: 'existing-1',
  title: 'Дупка пред блок 12',
  description: 'Дълбока',
  categoryCode: 1008,
  latitude: 42.6977,
  longitude: 23.3219,
  createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  status: 'SENT',
  reportedBy: 'someone-else',
  upvoteCount: 0,
  downvoteCount: 0,
  confirmationCount: 4,
  credibilityScore: 0,
  resolvedAt: null,
  districtCode: 'LOZENETS',
  authorityCode: 'LOZENETS',
  closedBy: null,
  fixCheck: UNCHECKED_FIX,
}

const MATCHES: SimilarReportsResponse = {
  radiusMeters: 100,
  reports: [{ report: existing, meters: 35 }],
  callSofia: [
    {
      id: 788076,
      registryNumber: 'СОА26-КЦ01-103731/13.09.2026',
      title: 'Пропаднала шахта',
      categoryCode: 1007,
      submittedAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
      meters: 60,
      url: 'https://call.sofia.bg/signals/788076',
    },
  ],
}

/** A subcategory and a place make the form ask; the place is the map centre by default. */
async function chooseRoadway(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('listitem', { name: 'Пътища и шахти' }))
  await user.click(screen.getByRole('radio', { name: /Улично платно/ }))
}

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
  similar.mockResolvedValue(NO_MATCHES)
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

describe('CreateAlertModal — is it already reported?', () => {
  it('asks only once a subcategory is chosen, and shows nothing when nothing is near', async () => {
    const user = userEvent.setup()
    renderModal()
    expect(similar).not.toHaveBeenCalled()

    await chooseRoadway(user)

    await waitFor(() => expect(similar).toHaveBeenCalledWith(42.6977, 23.3219, 1007))
    await waitFor(() => expect(screen.queryByText('Проверяваме за подобни сигнали…')).not.toBeInTheDocument())
    expect(screen.queryByText('Може би вече е подаден?')).not.toBeInTheDocument()
  })

  it('shows nabat and Call Sofia matches with their distances', async () => {
    similar.mockResolvedValue(MATCHES)
    const user = userEvent.setup()
    renderModal()

    await chooseRoadway(user)

    expect(await screen.findByText('Може би вече е подаден?')).toBeInTheDocument()
    expect(screen.getByText(/има 2 сигнала от същата група/)).toBeInTheDocument()
    expect(screen.getByText('Дупка пред блок 12')).toBeInTheDocument()
    expect(screen.getByText(/Тротоар · на 35 м/)).toBeInTheDocument()
    expect(screen.getByText(/потвърждения: 4/)).toBeInTheDocument()
    expect(screen.getByText('В Call Sofia')).toBeInTheDocument()
    expect(screen.getByText(/на 60 м · подаден преди 12 дни/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /отвори в call sofia/i })).toHaveAttribute(
      'href',
      'https://call.sofia.bg/signals/788076',
    )
    // Nabat cannot vote in Call Sofia: one confirm button, for the nabat match only.
    expect(screen.getAllByRole('button', { name: /и аз го виждам/i })).toHaveLength(1)
  })

  it('confirms the existing report instead of filing a new one', async () => {
    similar.mockResolvedValue(MATCHES)
    vote.mockResolvedValue({
      voteType: 'CONFIRM',
      stats: { upvotes: 0, downvotes: 0, confirmations: 5, credibilityScore: 0 },
    } as never)
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await chooseRoadway(user)
    await user.click(await screen.findByRole('button', { name: /и аз го виждам — потвърждавам/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(vote).toHaveBeenCalledWith('existing-1', { voteType: 'CONFIRM' })
    expect(useAlertStore.getState().selectedAlertId).toBe('existing-1')
    expect(create).not.toHaveBeenCalled()
  })

  it('keeps the form open when the voting service is down', async () => {
    similar.mockResolvedValue(MATCHES)
    vote.mockRejectedValue({ response: { status: 503, data: { code: 'SERVICE_UNAVAILABLE' } } })
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await chooseRoadway(user)
    await user.click(await screen.findByRole('button', { name: /и аз го виждам — потвърждавам/i }))

    await waitFor(() => expect(vote).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Може би вече е подаден?')).toBeInTheDocument()
  })

  it('"mine is different" puts the advice away', async () => {
    similar.mockResolvedValue(MATCHES)
    const user = userEvent.setup()
    renderModal()

    await chooseRoadway(user)
    await user.click(await screen.findByRole('button', { name: /моят е различен/i }))

    expect(screen.queryByText('Може би вече е подаден?')).not.toBeInTheDocument()
  })

  /** Advice, never a gate. */
  it('still files the report with matches on screen', async () => {
    similar.mockResolvedValue(MATCHES)
    create.mockResolvedValue({} as never)
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.type(screen.getByLabelText(/заглавие/i), 'Дупка')
    await user.type(screen.getByPlaceholderText(/опишете проблема/i), 'Друга дупка')
    await chooseRoadway(user)
    expect(await screen.findByText('Може би вече е подаден?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /изпрати сигнала/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ categoryCode: 1007 }))
  })
})
