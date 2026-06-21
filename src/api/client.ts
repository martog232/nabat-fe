import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const DEFAULT_API_BASE = '/api/v1'

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function toWebSocketBase(httpBase: string) {
  const url = new URL(httpBase)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  // WS endpoint lives at /ws/*, so strip REST prefix like /api/v1 if present.
  url.pathname = url.pathname.replace(/\/api\/v\d+\/?$/i, '')
  url.pathname = url.pathname.replace(/\/+$/, '')
  return normalizeBaseUrl(url.toString())
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function isWsUrl(value: string) {
  return /^wss?:\/\//i.test(value)
}

function resolveHttpBase(value: string) {
  const normalized = normalizeBaseUrl(value)
  if (isHttpUrl(normalized)) return normalized

  const path = normalized.startsWith('/') ? normalized : `/${normalized}`
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }

  return `http://127.0.0.1:8080${path}`
}

function resolveWebSocketBase(value: string, fallbackHttpBase: string) {
  const normalized = normalizeBaseUrl(value)

  if (isWsUrl(normalized)) return normalized
  if (isHttpUrl(normalized)) return toWebSocketBase(normalized)

  const path = normalized.startsWith('/') ? normalized : `/${normalized}`
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${path}`
  }

  return toWebSocketBase(fallbackHttpBase)
}

function toAxiosBase(httpBase: string) {
  if (/\/api\/v\d+$/i.test(httpBase)) return httpBase
  return normalizeBaseUrl(`${httpBase}/api/v1`)
}

export const API_BASE = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE ?? DEFAULT_API_BASE,
)
const RESOLVED_HTTP_BASE = resolveHttpBase(API_BASE)
export const WS_BASE = resolveWebSocketBase(
  import.meta.env.VITE_WS_BASE ?? toWebSocketBase(RESOLVED_HTTP_BASE),
  RESOLVED_HTTP_BASE,
)

export function buildWebSocketUrl(path: string, params?: Record<string, string | null | undefined>) {
  const url = new URL(path.replace(/^\/+/, ''), `${WS_BASE}/`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value)
    })
  }

  return url.toString()
}

export const apiClient = axios.create({
  baseURL: toAxiosBase(API_BASE),
  headers: { 'Content-Type': 'application/json' },
})

// Inject access token on every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Token refresh on 401 ────────────────────────────────────────────────────

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

function clearSessionAndRedirect() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  // Also drop the persisted zustand auth state, otherwise a full reload would
  // rehydrate a "logged in" user holding dead tokens.
  localStorage.removeItem('nabat-auth')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// A single in-flight refresh shared by all requests that 401 concurrently, so we
// hit /auth/refresh once and retry them all with the new token.
let refreshPromise: Promise<string | null> | null = null

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) return null
      try {
        // Bare axios (not apiClient) so this call can't recurse through the
        // 401 interceptor below.
        const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${toAxiosBase(API_BASE)}/auth/refresh`,
          { refreshToken },
        )
        localStorage.setItem('accessToken', data.accessToken)
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
        return data.accessToken
      } catch {
        return null
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// On 401: try once to refresh the access token and replay the request; only if
// that fails do we clear the session and redirect to login.
apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as RetriableConfig | undefined
    const requestUrl = original?.url ?? ''
    const isAuthEndpoint = /\/auth\/(login|register|refresh)(\?.*)?$/.test(requestUrl)

    if (err.response?.status !== 401 || isAuthEndpoint || !original) {
      return Promise.reject(err)
    }

    // Already retried with a fresh token and still 401 → the session is dead.
    if (original._retry) {
      clearSessionAndRedirect()
      return Promise.reject(err)
    }

    original._retry = true
    const newToken = await refreshAccessToken()
    if (!newToken) {
      clearSessionAndRedirect()
      return Promise.reject(err)
    }

    original.headers.Authorization = `Bearer ${newToken}`
    return apiClient(original)
  },
)
