import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { buildWebSocketUrl } from '../api/client'
import { useAlertStore } from '../store/alertStore'
import { alertsApi } from '../api/alerts'
import { authApi } from '../api/auth'
import type { Alert, WsFrame } from '../types'
import { useToastStore } from '../store/toastStore'
import { haversineDistanceM } from '../utils/geo'

const WS_FLUSH_INTERVAL_MS = 400

function mergeAlertsIntoCache(
  qc: ReturnType<typeof useQueryClient>,
  incoming: Alert[],
) {
  if (!incoming.length) return
  const { mapCenter, radiusKm } = useAlertStore.getState()
  const key = ['alerts', 'nearby', mapCenter, radiusKm]
  qc.setQueryData<Alert[]>(key, (old) => {
    if (!old) return incoming
    const map = new Map(old.map((a) => [a.id, a]))
    for (const a of incoming) map.set(a.id, a)
    return Array.from(map.values())
  })
}

export function useAlertWebSocket() {
  const qc = useQueryClient()
  const setWsConnected = useAlertStore((s) => s.setWsConnected)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAlerts = useRef<Alert[]>([])
  const reconnectAttempt = useRef(0)
  const shouldReconnect = useRef(true)
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

  const connect = useCallback(async () => {
    const token = localStorage.getItem('accessToken')

    if (!token || !shouldReconnect.current) {
      setWsConnected(false)
      return
    }

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }

    let ticket: string
    try {
      const wsTicket = await authApi.getWsTicket()
      ticket = wsTicket.ticket
    } catch {
      setWsConnected(false)

      if (!shouldReconnect.current) return

      reconnectAttempt.current += 1
      const delay = Math.min(30_000, 3_000 * 2 ** Math.min(reconnectAttempt.current - 1, 4))
      reconnectTimer.current = setTimeout(() => {
        void connect()
      }, delay)
      return
    }

    if (!shouldReconnect.current) return

    const url = buildWebSocketUrl('/ws/alerts', { ticket })
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttempt.current = 0
      setWsConnected(true)

      const since = disconnectedAt.current
      if (since) {
        disconnectedAt.current = null
        const { mapCenter, radiusKm } = useAlertStore.getState()
        alertsApi
          .getSince(mapCenter[0], mapCenter[1], radiusKm, since)
          .then((missed) => mergeAlertsIntoCache(qc, missed))
          .catch(() => {})
      }
    }

    ws.onmessage = (evt) => {
      try {
        const frame: WsFrame = JSON.parse(evt.data as string)
        if (frame.type === 'NEW_ALERT') {
          pendingAlerts.current.push(frame.alert)
          scheduleFlush()
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      flushPendingAlerts()
      disconnectedAt.current = new Date().toISOString()
      setWsConnected(false)

      if (!shouldReconnect.current) return

      reconnectAttempt.current += 1
      const delay = Math.min(30_000, 3_000 * 2 ** Math.min(reconnectAttempt.current - 1, 4))
      reconnectTimer.current = setTimeout(() => {
        void connect()
      }, delay)
    }

    ws.onerror = () => {
      setWsConnected(false)
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [flushPendingAlerts, scheduleFlush, qc, setWsConnected])

  useEffect(() => {
    shouldReconnect.current = true
    void connect()

    return () => {
      flushPendingAlerts()
      shouldReconnect.current = false
      setWsConnected(false)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (flushTimer.current) clearTimeout(flushTimer.current)
      wsRef.current?.close()
    }
  }, [connect, flushPendingAlerts, setWsConnected])
}