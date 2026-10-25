import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportPhoto } from './ReportPhoto'

let photo: { hasPhoto: boolean; src: string | null; isLoading: boolean; isError: boolean }

vi.mock('../../hooks/usePhoto', () => ({
  usePhoto: () => photo,
}))

afterEach(cleanup)

describe('ReportPhoto', () => {
  it('shows nothing for a report without a photo', () => {
    photo = { hasPhoto: false, src: null, isLoading: false, isError: false }
    const { container } = render(<ReportPhoto title="Дупка" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('says so when the photo cannot be loaded', () => {
    photo = { hasPhoto: true, src: null, isLoading: false, isError: true }
    render(<ReportPhoto photoUrl="/api/v1/uploads/a.jpg" title="Дупка" />)
    expect(screen.getByText('Снимката не може да се зареди')).toBeInTheDocument()
  })

  it('opens the photo over the whole screen and closes it with Escape', async () => {
    photo = { hasPhoto: true, src: 'blob:photo', isLoading: false, isError: false }
    const user = userEvent.setup()
    render(<ReportPhoto photoUrl="/api/v1/uploads/a.jpg" title="Дупка" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Отвори снимката' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes when the backdrop is pressed but not the photo itself', async () => {
    photo = { hasPhoto: true, src: 'blob:photo', isLoading: false, isError: false }
    const user = userEvent.setup()
    render(<ReportPhoto photoUrl="/api/v1/uploads/a.jpg" title="Дупка" />)

    await user.click(screen.getByRole('button', { name: 'Отвори снимката' }))
    const dialog = screen.getByRole('dialog')
    await user.click(dialog.querySelector('img')!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(dialog)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
