import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { buildWebSocketUrl } from '../api/client'
import { useAlertStore } from '../store/alertStore'
import { alertsApi } from '../api/alerts'
import { authApi } from '../api/auth'
import { useToastStore } from '../store/toastStore'
import { haversineDistanceM } from '../utils/geo'
import { useWebSocket } from './useWebSocket'
import type { Alert, WsFrame } from '../types'

const WS_FLUSH_INTERVAL_MS = 400

/**
 * Merges incoming alerts into every cached nearby-alerts query.
 *
 * Writes to all `['alerts','nearby',…]` entries rather than reconstructing the key
 * from the store's *current* centre and radius. The old approach dropped frames: if
 * the user panned the map between a frame arriving and the 400 ms flush running, the
 * merge wrote to a key nothing was subscribed to and the new alert simply never
 * appeared.
 */
function mergeAlertsIntoCache(
  qc: ReturnType<typeof useQueryClient>,
  incoming: Alert[],
) {
  if (!incoming.length) return

  qc.setQueriesData<Alert[]>({ queryKey: ['alerts', 'nearby'] }, (old) => {
    if (!old) return old
    const map = new Map(old.map((a) => [a.id, a]))
    for (const a of incoming) map.set(a.id, a)
    return Array.from(map.values())
  })
}

export function useAlertWebSocket() {
  const qc = useQueryClient()
  const setWsConnected = useAlertStore((s) => s.setWsConnected)
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAlerts = useRef<Alert[]>([])
  const disconnectedAt = useRef<string | null>(null)

  const flushPendingAlerts = useCallback(() => {
    flushTimer.current = null
    if (!pendingAlerts.current.length) return

    const batch = pendingAlerts.current
    pendingAlerts.current = []
    mergeAlertsIntoCache(qc, batch)

    const { userLat, userLng, radiusKm } = useAlertStore.getState()
    if (userLat === null || userLng === null) return

    for (const alert of batch) {
      const distM = haversineDistanceM(userLat, userLng, alert.latitude, alert.longitude)
      if (distM <= radiusKm * 1000) {
        useToastStore.getState().addToast({
          type: 'info',
          message: `${alert.type.replace(/_/g, ' ')}: ${alert.title} (${(distM / 1000).toFixed(1)} km away)`,
          duration: 6_000,
        })
      }
    }
  }, [qc])

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return
    flushTimer.current = setTimeout(flushPendingAlerts, WS_FLUSH_INTERVAL_MS)
  }, [flushPendingAlerts])

  useWebSocket({
    getUrl: async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return null

      try {
        const wsTicket = await authApi.getWsTicket()
        return buildWebSocketUrl('/ws/alerts', { ticket: wsTicket.ticket })
      } catch {
        return null
      }
    },

    onMessage: (data) => {
      try {
        const frame: WsFrame = JSON.parse(data)
        if (frame.type === 'NEW_ALERT') {
          pendingAlerts.current.push(frame.alert)
          scheduleFlush()
        } else if (frame.type === 'ALERT_UPDATED') {
          mergeAlertsIntoCache(qc, [frame.alert])
          // Vote tallies changed, so any per-alert vote query is stale too.
          qc.invalidateQueries({ queryKey: ['votes', frame.alert.id] })
        } else if (frame.type === 'NOTIFICATION') {
          qc.invalidateQueries({ queryKey: ['notifications'] })
          useToastStore.getState().addToast({
            type: 'info',
            message: frame.notification.title,
            duration: 6_000,
          })
        }
      } catch {
        // ignore malformed frames
      }
    },

    onOpen: () => {
      const since = disconnectedAt.current
      if (since) {
        disconnectedAt.current = null
        const { mapCenter, radiusKm } = useAlertStore.getState()
        alertsApi
          .getSince(mapCenter[0], mapCenter[1], radiusKm, since)
          .then((missed) => mergeAlertsIntoCache(qc, missed))
          .catch(() => {})
      }
    },

    onClose: () => {
      flushPendingAlerts()
      disconnectedAt.current = new Date().toISOString()
    },

    onConnectionChange: (connected) => {
      setWsConnected(connected)
    },
  })

  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current)
    }
  }, [])
}
