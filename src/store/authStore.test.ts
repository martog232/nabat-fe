import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  displayName: 'Test',
  role: 'USER' as const,
  notificationRadiusKm: 5,
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    error: null,
  })
})

describe('authStore', () => {
  describe('logout', () => {
    it('clears user and tokens', () => {
      useAuthStore.setState({
        user: mockUser,
        accessToken: 'tok',
        refreshToken: 'ref',
      })
      localStorage.setItem('accessToken', 'tok')
      localStorage.setItem('refreshToken', 'ref')

      useAuthStore.getState().logout()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().accessToken).toBeNull()
      expect(useAuthStore.getState().refreshToken).toBeNull()
      expect(localStorage.getItem('accessToken')).toBeNull()
    })
  })

  describe('clearError', () => {
    it('resets error to null', () => {
      useAuthStore.setState({ error: 'Some error' })
      useAuthStore.getState().clearError()
      expect(useAuthStore.getState().error).toBeNull()
    })
  })

  describe('login', () => {
    it('sets loading state during login', async () => {
      const promise = useAuthStore.getState().login('a@b.com', 'pass')
      expect(useAuthStore.getState().isLoading).toBe(true)
      await expect(promise).rejects.toThrow()
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('sets error on failure', async () => {
      await expect(useAuthStore.getState().login('a@b.com', 'pass')).rejects.toThrow()
      expect(useAuthStore.getState().error).toBeTruthy()
    })
  })

  describe('register', () => {
    it('sets loading and error states', async () => {
      const promise = useAuthStore.getState().register('a@b.com', 'pass', 'A')
      expect(useAuthStore.getState().isLoading).toBe(true)
      await expect(promise).rejects.toThrow()
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().error).toBeTruthy()
    })
  })
})
