import { create } from 'zustand'

/**
 * How long the map has to sit still before its centre is used to fetch alerts, and how
 * finely that centre is rounded — three decimals is about 110 m at this latitude.
 *
 * The map reports a new centre on every `moveend`, and each distinct centre used to be
 * its own request and its own cache entry: a minute of ordinary panning produced six
 * fetches, two of them 200 m apart. Rounding first means a nudge that lands within the
 * same ~110 m square reuses the cached answer instead of fetching a near-identical one,
 * and the delay collapses a burst of small moves into the position the user stopped at.
 *
 * Both live here rather than in `useNearbyAlerts` because four components call that hook.
 * A timer per caller would let them settle at slightly different moments, each fetching
 * its own key — more requests than before, not fewer. One centre in the store keeps them
 * subscribed to a single query.
 */
const QUERY_CENTRE_DEBOUNCE_MS = 400
const QUERY_CENTRE_DECIMALS = 3

function roundCentre([lat, lng]: [number, number]): [number, number] {
  const factor = 10 ** QUERY_CENTRE_DECIMALS
  return [Math.round(lat * factor) / factor, Math.round(lng * factor) / factor]
}

interface AlertStore {
  selectedAlertId: string | null
  mapCenter: [number, number]
  /**
   * The centre alerts are actually fetched for: rounded, and trailing `mapCenter` by
   * the debounce. Read this in query keys; read `mapCenter` for anything that has to
   * track the map itself.
   */
  queryCenter: [number, number]
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

const INITIAL_CENTER: [number, number] = [42.6977, 23.3219]

// Module scope, so the timer is shared by every caller and survives re-renders. Tests
// that drive the store directly can advance it with vi.useFakeTimers().
let queryCenterTimer: ReturnType<typeof setTimeout> | undefined

export const useAlertStore = create<AlertStore>((set, get) => ({
  selectedAlertId: null,
  mapCenter: INITIAL_CENTER,
  queryCenter: roundCentre(INITIAL_CENTER),
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

  setMapCenter: (center) => {
    set({ mapCenter: center })

    const [lat, lng] = roundCentre(center)
    const [currentLat, currentLng] = get().queryCenter
    // Already the square being queried — no timer, so a map that jitters around one
    // spot never restarts the countdown and the query is left alone entirely.
    if (lat === currentLat && lng === currentLng) return

    clearTimeout(queryCenterTimer)
    queryCenterTimer = setTimeout(() => {
      const [settledLat, settledLng] = roundCentre(get().mapCenter)
      set({ queryCenter: [settledLat, settledLng] })
    }, QUERY_CENTRE_DEBOUNCE_MS)
  },

  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setRadiusKm: (r) => set({ radiusKm: r }),
  setUserLocation: (lat, lng, accuracy) =>
    set({ userLat: lat, userLng: lng, locationAccuracy: accuracy }),
  setFollowUser: (follow) => set({ followUser: follow }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setNearbyTruncation: (truncated, limit) => set({ nearbyTruncated: truncated, nearbyLimit: limit }),
}))
