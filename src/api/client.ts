import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const DEFAULT_API_BASE = 'http://localhost:8080'

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function toWebSocketBase(httpBase: string) {
  const url = new URL(httpBase)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = url.pathname.replace(/\/+$/, '')
  return normalizeBaseUrl(url.toString())
}

export const API_BASE = normalizeBaseUrl(import.meta.env.VITE_API_BASE ?? DEFAULT_API_BASE)
export const WS_BASE = normalizeBaseUrl(import.meta.env.VITE_WS_BASE ?? toWebSocketBase(API_BASE))

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
  baseURL: `${API_BASE}/api/v1`,
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

// On 401, clear tokens and redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)
