import { useEffect } from 'react'
import { useAlertStore } from '../store/alertStore'

/**
 * Where the user is, for the map to follow — and only for that. The position used to be
 * sent to the account every 200 m or 5 minutes, so the backend could push reports to people
 * near them. That push is gone, and a location history of every user with it: nothing here
 * leaves the browser any more.
 */
export function useGeolocation() {
  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const accuracy = position.coords.accuracy

        const state = useAlertStore.getState()
        state.setUserLocation(lat, lng, accuracy)

        if (state.followUser) {
          state.setMapCenter([lat, lng])
        }
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
