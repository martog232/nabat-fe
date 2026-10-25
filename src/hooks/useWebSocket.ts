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
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempt = useRef(0)

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
    /*
     * Local to this run of the effect, not a ref, and that is the whole point.
     *
     * `connect` awaits a WebSocket ticket over HTTP, so a run can still be in flight when its
     * own cleanup fires — which under StrictMode is every mount. With the cancelled flag on a
     * ref shared by all runs, the second mount set it back to true while the first run was
     * still awaiting, that run then sailed past its guard and opened a socket nobody could
     * close, and the second opened another. Two live sockets, every frame delivered twice,
     * every toast shown twice.
     *
     * Closing over it means a run can only ever be cancelled by its own cleanup.
     */
    let cancelled = false
    let socket: WebSocket | null = null

    const scheduleReconnect = () => {
      if (cancelled) return

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

      if (cancelled) return

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
      socket = ws

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
      cancelled = true
      onConnectionChangeRef.current?.(false)
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      // This run's socket. It used to be a ref shared by every run, which a later run had
      // already overwritten by the time this ran — so the cleanup closed the connection meant
      // to survive and left its own behind.
      socket?.close()
      socket = null
    }
  }, [reconnectBaseDelayMs, reconnectMaxDelayMs])
}
