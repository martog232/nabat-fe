import { create } from 'zustand'

interface AlertStore {
  selectedAlertId: string | null
  mapCenter: [number, number]
  mapZoom: number
  radiusKm: number
  userLat: number | null
  userLng: number | null
  locationAccuracy: number | null
  followUser: boolean
  wsConnected: boolean
  /** The nearby query hit the server-side cap, so the map is showing a partial answer. */
  nearbyTruncated: boolean
  /** The cap that was applied, so the hint can say what it was. */
  nearbyLimit: number

  selectAlert: (alertId: string | null) => void
  setMapCenter: (center: [number, number]) => void
  setMapZoom: (zoom: number) => void
  setRadiusKm: (r: number) => void
  setUserLocation: (lat: number, lng: number, accuracy: number) => void
  setFollowUser: (follow: boolean) => void
  setWsConnected: (connected: boolean) => void
  setNearbyTruncation: (truncated: boolean, limit: number) => void
}

export const useAlertStore = create<AlertStore>((set) => ({
  selectedAlertId: null,
  mapCenter: [42.6977, 23.3219],
  mapZoom: 13,
  radiusKm: 5,
  userLat: null,
  userLng: null,
  locationAccuracy: null,
  followUser: true,
  wsConnected: false,
  nearbyTruncated: false,
  nearbyLimit: 0,

  selectAlert: (alertId) => set({ selectedAlertId: alertId }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setRadiusKm: (r) => set({ radiusKm: r }),
  setUserLocation: (lat, lng, accuracy) =>
    set({ userLat: lat, userLng: lng, locationAccuracy: accuracy }),
  setFollowUser: (follow) => set({ followUser: follow }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setNearbyTruncation: (truncated, limit) => set({ nearbyTruncated: truncated, nearbyLimit: limit }),
}))
