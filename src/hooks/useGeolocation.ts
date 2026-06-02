import { useEffect, useRef } from 'react'
import { userApi } from '../api/user'
import { useAlertStore } from '../store/alertStore'
import { haversineDistanceM } from '../utils/geo'

const LOCATION_UPDATE_DISTANCE_THRESHOLD_M = 200
const LOCATION_UPDATE_TIME_THRESHOLD_MS = 5 * 60 * 1000

export function useGeolocation() {
  const lastSyncedRef = useRef<{ lat: number; lng: number; at: number } | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const accuracy = position.coords.accuracy
        const now = Date.now()

        const state = useAlertStore.getState()
        state.setUserLocation(lat, lng, accuracy)

        if (state.followUser) {
          state.setMapCenter([lat, lng])
        }

        const lastSync = lastSyncedRef.current
        const movedEnough = !lastSync
          || haversineDistanceM(lastSync.lat, lastSync.lng, lat, lng) > LOCATION_UPDATE_DISTANCE_THRESHOLD_M
        const staleEnough = !lastSync || now - lastSync.at > LOCATION_UPDATE_TIME_THRESHOLD_MS

        if (!movedEnough && !staleEnough) return

        lastSyncedRef.current = { lat, lng, at: now }

        void userApi.updatePreferences({
          notificationRadiusKm: state.radiusKm,
          lastKnownLat: lat,
          lastKnownLng: lng,
        }).catch(() => {
          // Intentionally silent for geolocation preference sync failures.
        })
      },
      () => {
        // Intentionally silent for geolocation permission/availability failures.
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])
}
