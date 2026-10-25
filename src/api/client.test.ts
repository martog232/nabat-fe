import { describe, it, expect, afterEach, vi } from 'vitest'

/**
 * These cover how the two base URLs are read, which is build-time configuration and so
 * has no other way of being checked before it reaches a browser.
 *
 * The case that matters is an empty string rather than an absent variable: `VITE_WS_BASE`
 * arrived as `''` from a Docker build arg declared with no value, `??` accepted it, and
 * the app opened its WebSocket against the page's own origin — the nginx serving the
 * bundle, which has no /ws route. The HAR showed it as a socket to :5173 failing on
 * repeat, while every REST call went to :8000 and succeeded.
 */

async function loadClient(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, '')
    else vi.stubEnv(key, value)
  }
  return import('./client')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('API and WebSocket base resolution', () => {
  it('derives the socket base from the API base when VITE_WS_BASE is empty', async () => {
    const { API_BASE, WS_BASE } = await loadClient({
      VITE_API_BASE_URL: 'http://localhost:8000/api/v1',
      VITE_WS_BASE: '',
    })

    expect(API_BASE).toBe('http://localhost:8000/api/v1')
    // Not window.location.origin, which in jsdom is a different port entirely — that
    // substitution is the bug this guards.
    expect(WS_BASE).toBe('ws://localhost:8000')
  })

  it('honours an explicit VITE_WS_BASE', async () => {
    const { WS_BASE } = await loadClient({
      VITE_API_BASE_URL: 'http://localhost:8000/api/v1',
      VITE_WS_BASE: 'ws://gateway.example:9000',
    })

    expect(WS_BASE).toBe('ws://gateway.example:9000')
  })

  it('falls back to the relative default when the API base is empty', async () => {
    const { API_BASE } = await loadClient({ VITE_API_BASE_URL: '', VITE_API_BASE: '' })

    expect(API_BASE).toBe('/api/v1')
  })
})
