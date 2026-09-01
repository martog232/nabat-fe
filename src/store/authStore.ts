import { create, type StateCreator } from 'zustand'
import { persist, type PersistOptions } from 'zustand/middleware'
import type { User } from '../types'
import { authApi } from '../api/auth'

/**
 * Messages for the error codes this store can surface.
 *
 * The backend returns curated prose plus a stable `code`. Wording that is specific to
 * *this* screen belongs here rather than being taken from the server response — the
 * server's `message` for a duplicate registration, for instance, is deliberately
 * generic. Field-level validation messages are still read from `errors`, since those
 * are written for the client.
 */
const CODE_MESSAGES: Record<string, string> = {
  BAD_CREDENTIALS: 'Incorrect email or password',
  EMAIL_ALREADY_REGISTERED: 'An account with that email already exists',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again shortly.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
}

function getApiErrorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: unknown } }).response?.data

    if (typeof data === 'object' && data !== null) {
      const code = (data as { code?: unknown }).code
      if (typeof code === 'string' && CODE_MESSAGES[code]) {
        return CODE_MESSAGES[code]
      }

      // Per-field validation detail is the one server-authored text worth showing.
      const maybeErrors = (data as { errors?: unknown }).errors
      if (typeof maybeErrors === 'object' && maybeErrors !== null) {
        const firstError = Object.values(maybeErrors as Record<string, unknown>).find((v) => typeof v === 'string')
        if (typeof firstError === 'string' && firstError.trim()) {
          return firstError
        }
      }

      const maybeMessage = (data as { message?: unknown }).message
      if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
        return maybeMessage
      }
    }
  }

  // Deliberately not err.message: for a network failure that is "Network Error" or an
  // axios internal string, which is noise to a user.
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

  /**
   * Replaces fields on the signed-in user without touching the tokens.
   *
   * <p>For settings the server has accepted: the response is the new truth, and the copy the
   * app renders from — persisted, so a reload does not show the old value back — has to move
   * with it. Not a login, so nothing here may clear or reissue a token.
   */
  applyUserChanges: (changes: Partial<User>) => void
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

// The persist mutator's second type argument is `unknown` when composed via
// create()(persist(...)); annotating it with PersistedAuth here trips strict mode.
const createAuthState: StateCreator<
  AuthState,
  [['zustand/persist', unknown]],
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
    // The persist middleware writes the nulls below back to `nabat-auth`, but do it
    // eagerly too: a reload racing the write would otherwise rehydrate a logged-in
    // user holding tokens that have just been cleared.
    localStorage.removeItem('nabat-auth')
    set({ user: null, accessToken: null, refreshToken: null, error: null })
  },

  clearError: () => set({ error: null }),

  applyUserChanges: (changes) =>
    // Guarded: with no signed-in user there is nothing to merge into, and creating one out of
    // a partial would leave a half-built User behind a route that only checks for its presence.
    set((s) => (s.user ? { user: { ...s.user, ...changes } } : {})),
})

export const useAuthStore = create<AuthState>()(persist(createAuthState, persistOptions))
