import { describe, it, expect, beforeEach } from 'vitest'
import { useAlertStore } from './alertStore'

beforeEach(() => {
  useAlertStore.setState({
    selectedAlertId: null,
    mapCenter: [42.6977, 23.3219],
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
})
