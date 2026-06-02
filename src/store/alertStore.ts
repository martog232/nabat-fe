import { create } from 'zustand'
import type { Alert } from '../types'

interface AlertStore {
  alerts: Alert[]
  selectedAlert: Alert | null
  mapCenter: [number, number]
  mapZoom: number
  radiusKm: number
  userLat: number | null
  userLng: number | null
  locationAccuracy: number | null
  followUser: boolean
  wsConnected: boolean

  setAlerts: (alerts: Alert[]) => void
  addAlert: (alert: Alert) => void
  upsertAlerts: (alerts: Alert[]) => void
  selectAlert: (alert: Alert | null) => void
  setMapCenter: (center: [number, number]) => void
  setMapZoom: (zoom: number) => void
  setRadiusKm: (r: number) => void
  setUserLocation: (lat: number, lng: number, accuracy: number) => void
  setFollowUser: (follow: boolean) => void
  setWsConnected: (connected: boolean) => void
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  selectedAlert: null,
  mapCenter: [42.6977, 23.3219], // Sofia, Bulgaria default
  mapZoom: 13,
  radiusKm: 5,
  userLat: null,
  userLng: null,
  locationAccuracy: null,
  followUser: true,
  wsConnected: false,

  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) =>
    set((s) => {
      const exists = s.alerts.some((a) => a.id === alert.id)
      if (exists) return s
      return { alerts: [alert, ...s.alerts] }
    }),
  upsertAlerts: (alerts) =>
    set((s) => {
      if (!alerts.length) return s

      const incomingById = new Map<string, Alert>()
      for (const alert of alerts) {
        incomingById.set(alert.id, alert)
      }

      if (!incomingById.size) return s

      let hasUpdate = false
      const mergedExisting = s.alerts.map((existing) => {
        const incoming = incomingById.get(existing.id)
        if (!incoming) return existing
        incomingById.delete(existing.id)
        hasUpdate = true
        return incoming
      })

      if (!incomingById.size) {
        return hasUpdate ? { alerts: mergedExisting } : s
      }

      const newAlerts = Array.from(incomingById.values()).reverse()
      return { alerts: [...newAlerts, ...mergedExisting] }
    }),
  selectAlert: (alert) => set({ selectedAlert: alert }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setRadiusKm: (r) => set({ radiusKm: r }),
  setUserLocation: (lat, lng, accuracy) =>
    set({ userLat: lat, userLng: lng, locationAccuracy: accuracy }),
  setFollowUser: (follow) => set({ followUser: follow }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
}))
