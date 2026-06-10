import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToastStore } from './toastStore'

beforeEach(() => {
  vi.useFakeTimers()
  useToastStore.setState({ toasts: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toastStore', () => {
  describe('addToast', () => {
    it('adds a toast and returns its id', () => {
      const id = useToastStore.getState().addToast({ type: 'info', message: 'Hello' })
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('sets default duration to 4000', () => {
      useToastStore.getState().addToast({ type: 'info', message: 'Hello' })
      const toast = useToastStore.getState().toasts[0]
      expect(toast.duration).toBe(4000)
    })
  })

  describe('removeToast', () => {
    it('removes a toast by id', () => {
      const id = useToastStore.getState().addToast({ type: 'success', message: 'Done' })
      expect(useToastStore.getState().toasts).toHaveLength(1)
      useToastStore.getState().removeToast(id)
      expect(useToastStore.getState().toasts).toHaveLength(0)
    })
  })
})
