import { create, type StateCreator } from 'zustand'
import { persist, type PersistOptions } from 'zustand/middleware'
import type { User } from '../types'
import { authApi } from '../api/auth'

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
      const msg = err instanceof Error ? err.message : 'Login failed'
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
      const msg = err instanceof Error ? err.message : 'Registration failed'
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
