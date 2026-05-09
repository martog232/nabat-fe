import { create, type StateCreator } from 'zustand'
import { persist, type PersistOptions } from 'zustand/middleware'
import type { User } from '../types'
import { authApi } from '../api/auth'

function getApiErrorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: unknown } }).response
    const data = response?.data

    if (typeof data === 'object' && data !== null) {
      const maybeMessage = (data as { message?: unknown }).message
      if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
        return maybeMessage
      }

      const maybeErrors = (data as { errors?: unknown }).errors
      if (typeof maybeErrors === 'object' && maybeErrors !== null) {
        const firstError = Object.values(maybeErrors as Record<string, unknown>).find((v) => typeof v === 'string')
        if (typeof firstError === 'string' && firstError.trim()) {
          return firstError
        }
      }
    }
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message
  }

  return fallback
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

type PersistedAuth = Pick<AuthState, 'user' | 'accessToken' | 'refreshToken'>

const persistOptions: PersistOptions<AuthState, PersistedAuth> = {
  name: 'nabat-auth',
  partialize: (s): PersistedAuth => ({
    user: s.user,
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
  }),
}

const createAuthState: StateCreator<
  AuthState,
  [['zustand/persist', PersistedAuth]],
  [],
  AuthState
> = (set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.login({ email, password })
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isLoading: false })
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Login failed')
      set({ isLoading: false, error: msg })
      throw err
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.register({ email, password, displayName })
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isLoading: false })
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Registration failed')
      set({ isLoading: false, error: msg })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null, accessToken: null, refreshToken: null })
  },

  clearError: () => set({ error: null }),
})

export const useAuthStore = create<AuthState>()(persist(createAuthState, persistOptions))
