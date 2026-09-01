import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { MapPage } from './pages/MapPage'
import { SettingsPage } from './pages/SettingsPage'
import { LandingPage } from './pages/LandingPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ToastContainer } from './components/common/ToastContainer'
import { useThemeStore } from './store/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  const initializeTheme = useThemeStore((s) => s.initializeTheme)

  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>

      {/* Global toast notifications — rendered outside the router so they
          survive page transitions and are always on top of the map */}
      <ToastContainer />
    </QueryClientProvider>
  )
}
