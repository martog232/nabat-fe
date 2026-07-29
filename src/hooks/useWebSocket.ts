import { useEffect, useRef } from 'react'

export type UseWebSocketOptions = {
  getUrl: () => Promise<string | null>
  onMessage: (data: string) => void
  onOpen?: () => void
  onClose?: () => void
  onConnectionChange?: (connected: boolean) => void
  reconnectBaseDelayMs?: number
  reconnectMaxDelayMs?: number
}

const DEFAULT_BASE_DELAY = 3_000
const DEFAULT_MAX_DELAY = 30_000

export function useWebSocket({
  getUrl,
  onMessage,
  onOpen,
  onClose,
  onConnectionChange,
  reconnectBaseDelayMs = DEFAULT_BASE_DELAY,
  reconnectMaxDelayMs = DEFAULT_MAX_DELAY,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempt = useRef(0)
  const shouldReconnect = useRef(true)

  const getUrlRef = useRef(getUrl)
  const onMessageRef = useRef(onMessage)
  const onOpenRef = useRef(onOpen)
  const onCloseRef = useRef(onClose)
  const onConnectionChangeRef = useRef(onConnectionChange)

  getUrlRef.current = getUrl
  onMessageRef.current = onMessage
  onOpenRef.current = onOpen
  onCloseRef.current = onClose
  onConnectionChangeRef.current = onConnectionChange

  useEffect(() => {
    shouldReconnect.current = true

    const scheduleReconnect = () => {
      if (!shouldReconnect.current) return

      reconnectAttempt.current += 1
      const delay = Math.min(
        reconnectMaxDelayMs,
        reconnectBaseDelayMs * 2 ** Math.min(reconnectAttempt.current - 1, 4),
      )
      reconnectTimer.current = setTimeout(() => {
        void connect()
      }, delay)
    }

    const connect = async () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }

      let url: string | null = null
      try {
        url = await getUrlRef.current()
      } catch {
        url = null
      }

      if (!shouldReconnect.current) return

      if (!url) {
        onConnectionChangeRef.current?.(false)
        // Retry rather than giving up. `getUrl` fetches a short-lived WebSocket ticket,
        // so it fails on any transient error from POST /ws/tickets. Returning here without
        // scheduling anything meant no socket was created, so no `onclose` ever fired, so
        // no retry was ever queued — one blip left realtime updates dead until the
        // component remounted.
        scheduleReconnect()
        return
      }

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempt.current = 0
        onConnectionChangeRef.current?.(true)
        onOpenRef.current?.()
      }

      ws.onmessage = (evt) => {
        onMessageRef.current(evt.data as string)
      }

      ws.onclose = () => {
        onConnectionChangeRef.current?.(false)
        onCloseRef.current?.()
        scheduleReconnect()
      }

      ws.onerror = () => {
        onConnectionChangeRef.current?.(false)
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
      }
    }

    void connect()

    return () => {
      shouldReconnect.current = false
      onConnectionChangeRef.current?.(false)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [reconnectBaseDelayMs, reconnectMaxDelayMs])
}
