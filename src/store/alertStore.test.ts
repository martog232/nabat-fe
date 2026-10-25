import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAlertStore } from './alertStore'

beforeEach(() => {
  useAlertStore.setState({
    selectedAlertId: null,
    mapCenter: [42.6977, 23.3219],
    queryCenter: [42.698, 23.322],
    mapZoom: 13,
    radiusKm: 5,
    userLat: null,
    userLng: null,
    locationAccuracy: null,
    followUser: true,
    wsConnected: false,
  })
})

describe('alertStore', () => {
  describe('selectAlert', () => {
    it('sets and clears selected alert id', () => {
      useAlertStore.getState().selectAlert('alert-1')
      expect(useAlertStore.getState().selectedAlertId).toBe('alert-1')
      useAlertStore.getState().selectAlert(null)
      expect(useAlertStore.getState().selectedAlertId).toBeNull()
    })
  })

  describe('setUserLocation', () => {
    it('stores user coordinates and accuracy', () => {
      useAlertStore.getState().setUserLocation(42.7, 23.3, 10)
      expect(useAlertStore.getState().userLat).toBe(42.7)
      expect(useAlertStore.getState().userLng).toBe(23.3)
      expect(useAlertStore.getState().locationAccuracy).toBe(10)
    })
  })

  /**
   * `queryCenter` is what the nearby-alerts query key is built from, so these are really
   * about how many requests panning the map costs. Every `moveend` used to be its own
   * key, its own fetch and its own cache entry — a minute of browsing produced six.
   */
  describe('setMapCenter', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('moves the map immediately but delays the centre queries use', () => {
      useAlertStore.getState().setMapCenter([42.75, 23.4])

      expect(useAlertStore.getState().mapCenter).toEqual([42.75, 23.4])
      expect(useAlertStore.getState().queryCenter).toEqual([42.698, 23.322])

      vi.advanceTimersByTime(400)

      expect(useAlertStore.getState().queryCenter).toEqual([42.75, 23.4])
    })

    it('settles on where the map stopped, not on each place it passed through', () => {
      const store = useAlertStore.getState()
      store.setMapCenter([42.71, 23.33])
      vi.advanceTimersByTime(200)
      store.setMapCenter([42.72, 23.34])
      vi.advanceTimersByTime(200)
      store.setMapCenter([42.73, 23.35])
      vi.advanceTimersByTime(400)

      expect(useAlertStore.getState().queryCenter).toEqual([42.73, 23.35])
    })

    it('rounds to about 110 m, so a nudge within the same square changes nothing', () => {
      // Both of these round to 42.698 / 23.322 — the pair that is already being queried.
      useAlertStore.getState().setMapCenter([42.69781, 23.32236])
      vi.advanceTimersByTime(400)
      expect(useAlertStore.getState().queryCenter).toEqual([42.698, 23.322])

      useAlertStore.getState().setMapCenter([42.69822, 23.32164])
      vi.advanceTimersByTime(400)
      expect(useAlertStore.getState().queryCenter).toEqual([42.698, 23.322])
    })
  })
})
