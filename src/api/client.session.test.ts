import { describe, it, expect, afterEach, vi } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { apiClient } from './client'

/** Every request answers 401, as the API does to a call that needs a session. */
function refuseEverything() {
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError('Unauthorized', '401', config, null, {
      status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config,
    })
  }
}

describe('a 401', () => {
  const assign = vi.fn()

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    assign.mockReset()
  })

  function watchNavigation() {
    const location = { pathname: '/map', search: '', set href(url: string) { assign(url) } }
    vi.stubGlobal('location', location)
    Object.defineProperty(window, 'location', { value: location, configurable: true })
  }

  it('leaves someone reading the public map where they are', async () => {
    watchNavigation()
    refuseEverything()

    await expect(apiClient.get('/notifications/unread/count')).rejects.toBeInstanceOf(AxiosError)
    expect(assign).not.toHaveBeenCalled()
  })

  it('sends a session that died to sign in', async () => {
    watchNavigation()
    refuseEverything()
    localStorage.setItem('accessToken', 'expired')

    await expect(apiClient.get('/notifications/unread/count')).rejects.toBeInstanceOf(AxiosError)
    expect(assign).toHaveBeenCalledWith('/login')
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})
