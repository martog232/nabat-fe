import { describe, it, expect, afterEach, vi } from 'vitest'
import { alertsApi } from './alerts'
import { apiClient } from './client'

/**
 * A contract test for the one endpoint whose shape changed under us.
 *
 * `getNearby` was typed `Alert[]` and read `r.data` directly after the server started
 * answering `{ alerts, count, limit, truncated }`. Nothing caught it: the backend suite was
 * green because the backend was right, and the component tests were green because they mock
 * this module — so the only place the two halves meet was a running browser.
 *
 * These assert against a literal copy of the server's response body. When the envelope
 * changes again, this fails here instead of in someone's hands.
 */
afterEach(() => {
  vi.restoreAllMocks()
})

const envelope = {
  alerts: [
    { id: 'a1', title: 'Fire', severity: 'HIGH' },
    { id: 'a2', title: 'Flood', severity: 'LOW' },
  ],
  count: 2,
  limit: 100,
  truncated: false,
}

describe('alertsApi.getNearby', () => {
  it('returns the envelope, so callers can see the cap the server applied', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: envelope })

    const result = await alertsApi.getNearby(42.7, 23.3, 5)

    expect(result.alerts).toHaveLength(2)
    expect(result.truncated).toBe(false)
    expect(result.limit).toBe(100)
  })

  it('surfaces truncation rather than hiding a partial map behind a full-looking list', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { ...envelope, count: 100, limit: 100, truncated: true },
    })

    const result = await alertsApi.getNearby(42.7, 23.3, 50)

    expect(result.truncated).toBe(true)
  })
})

describe('alertsApi.getSince', () => {
  it('unwraps to a plain list, because the reconnect path merges into the alert cache', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: envelope })

    const missed = await alertsApi.getSince(42.7, 23.3, 5, '2026-08-21T00:00:00Z')

    // An array, not an envelope: mergeAlertsIntoCache iterates it.
    expect(Array.isArray(missed)).toBe(true)
    expect(missed.map((a) => a.id)).toEqual(['a1', 'a2'])
  })
})
