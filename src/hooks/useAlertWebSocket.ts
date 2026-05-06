import { useEffect, useRef, useCallback } from 'react'
import { buildWebSocketUrl } from '../api/client'
import { useAlertStore } from '../store/alertStore'
import type { WsFrame } from '../types'

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
  const addAlert = useAlertStore((s) => s.addAlert)
  const setWsConnected = useAlertStore((s) => s.setWsConnected)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempt = useRef(0)
  const shouldReconnect = useRef(true)

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
    }

    ws.onmessage = (evt) => {
      try {
        const frame: WsFrame = JSON.parse(evt.data as string)
        if (frame.type === 'NEW_ALERT') {
          addAlert(frame.alert)
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
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
  }, [addAlert, setWsConnected])

  useEffect(() => {
    shouldReconnect.current = true
    connect()

    return () => {
      shouldReconnect.current = false
      setWsConnected(false)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect, setWsConnected])
}