/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Default to nabat-app directly on 8080. It used to default to :8000 — the Kong
  // gateway port — so `npm run dev` could not reach the API out of the box unless
  // VITE_API_BASE_URL was set, even though the dev server is meant to bypass Kong.
  // 127.0.0.1 rather than localhost, matching the convention used across the project
  // (Windows resolves localhost to ::1 first, which the backend does not bind).
  const apiBase = env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080/api/v1'
  const proxyTarget = new URL(apiBase)

  // Keep only scheme + host for proxy target (strip /api/vX suffix when present).
  proxyTarget.pathname = proxyTarget.pathname.replace(/\/api\/v\d+\/?$/i, '') || '/'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget.toString(),
          changeOrigin: true,
        },
        '/ws': {
          target: proxyTarget.toString(),
          changeOrigin: true,
          ws: true,
        },
      },
    },
    test: {
      globals: false,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
