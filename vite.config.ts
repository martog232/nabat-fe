import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
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
  }
})
