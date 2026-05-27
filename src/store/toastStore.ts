import { create } from 'zustand'

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  /** Auto-dismiss after this many ms. Default 4 000. */
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2, 9)
    const duration = toast.duration ?? 4_000

    set((s) => ({
      toasts: [...s.toasts, { type: toast.type, message: toast.message, duration, id }],
    }))

    // Auto-dismiss
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)

    return id
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))



