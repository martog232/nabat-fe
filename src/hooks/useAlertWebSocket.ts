import { useEffect, useRef, useCallback } from 'react'
import { buildWebSocketUrl } from '../api/client'
import { useAlertStore } from '../store/alertStore'
import { alertsApi } from '../api/alerts'
import type { Alert, WsFrame } from '../types'

const WS_FLUSH_INTERVAL_MS = 400

// export function useAlertWebSocket(userId: string | null) {
//   const addAlert = useAlertStore((s) => s.addAlert)
//   const setWsConnected = useAlertStore((s) => s.setWsConnected)
//   const wsRef = useRef<WebSocket | null>(null)
//   const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
//   const reconnectAttempt = useRef(0)
//   const shouldReconnect = useRef(true)
//
//   const connect = useCallback(() => {
//     if (!userId || !shouldReconnect.current) {
//       setWsConnected(false)
//       return
//     }
//
//     if (reconnectTimer.current) {
//       clearTimeout(reconnectTimer.current)
//       reconnectTimer.current = null
//     }
//
//     const url = buildWebSocketUrl('/ws/alerts', { userId })
//     const ws = new WebSocket(url)
//     wsRef.current = ws
//
//     ws.onopen = () => {
//       reconnectAttempt.current = 0
//       setWsConnected(true)
//     }
//
//     ws.onmessage = (evt) => {
//       try {
//         const frame: WsFrame = JSON.parse(evt.data as string)
//         if (frame.type === 'NEW_ALERT') {
//           addAlert(frame.alert)
//         }
//       } catch {
//         // ignore malformed frames
//       }
//     }
//
//     ws.onclose = () => {
//       setWsConnected(false)
//
//       if (!shouldReconnect.current) return
//
//       reconnectAttempt.current += 1
//       const delay = Math.min(30_000, 3_000 * 2 ** Math.min(reconnectAttempt.current - 1, 4))
//       reconnectTimer.current = setTimeout(connect, delay)
//     }
//
//     ws.onerror = () => {
//       setWsConnected(false)
//       if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
//         ws.close()
//       }
//     }
//   }, [userId, addAlert, setWsConnected])
//
//   useEffect(() => {
//     shouldReconnect.current = true
//     connect()
//
//     return () => {
//       shouldReconnect.current = false
//       setWsConnected(false)
//       if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
//       wsRef.current?.close()
//     }
//   }, [connect, setWsConnected])
// }

export function useAlertWebSocket() {
  const upsertAlerts = useAlertStore((s) => s.upsertAlerts)
  const setWsConnected = useAlertStore((s) => s.setWsConnected)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAlerts = useRef<Alert[]>([])
  const reconnectAttempt = useRef(0)
  const shouldReconnect = useRef(true)
  /**
   * ISO timestamp recorded when the connection closes.
   * On the next successful open we use it as `since` to fetch any
   * alerts the client missed while the socket was down.
   */
  const disconnectedAt = useRef<string | null>(null)

  const flushPendingAlerts = useCallback(() => {
    flushTimer.current = null
    if (!pendingAlerts.current.length) return

    const batch = pendingAlerts.current
    pendingAlerts.current = []
    upsertAlerts(batch)
  }, [upsertAlerts])

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return
    flushTimer.current = setTimeout(flushPendingAlerts, WS_FLUSH_INTERVAL_MS)
  }, [flushPendingAlerts])

  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken')

    if (!token || !shouldReconnect.current) {
      setWsConnected(false)
      return
    }

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }

    const url = buildWebSocketUrl('/ws/alerts', { token })
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttempt.current = 0
      setWsConnected(true)

      // ── State catch-up after a reconnect ──────────────────────────────────
      // If we recorded a disconnect time, fetch any alerts created since then
      // so the client never displays stale safety data after a flaky connection.
      const since = disconnectedAt.current
      if (since) {
        disconnectedAt.current = null
        const { mapCenter, radiusKm } = useAlertStore.getState()
        alertsApi
          .getSince(mapCenter[0], mapCenter[1], radiusKm, since)
          .then((missed) => {
            if (missed.length > 0) upsertAlerts(missed)
          })
          .catch(() => {
            // Non-fatal: next periodic REST poll will fill the gap
          })
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
      // Record the moment we lost the connection so the next onopen can
      // request exactly the window of alerts we missed.
      disconnectedAt.current = new Date().toISOString()
      setWsConnected(false)

      if (!shouldReconnect.current) return

      reconnectAttempt.current += 1
      const delay = Math.min(30_000, 3_000 * 2 ** Math.min(reconnectAttempt.current - 1, 4))
      reconnectTimer.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      setWsConnected(false)
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [flushPendingAlerts, scheduleFlush, setWsConnected])

  useEffect(() => {
    shouldReconnect.current = true
    connect()

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