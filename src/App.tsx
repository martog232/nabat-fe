import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { LinkPage } from './pages/LinkPage'
import { MapPage } from './pages/MapPage'
import { SettingsPage } from './pages/SettingsPage'
import { LandingPage } from './pages/LandingPage'
import { AdminPage } from './pages/AdminPage'
import { AssignedReportsPage } from './pages/AssignedReportsPage'
import { ReportsPage } from './pages/ReportsPage'
import { DistrictComparisonPage } from './pages/DistrictComparisonPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute'
import { AdminRoute } from './components/auth/AdminRoute'
import { OfficialRoute } from './components/auth/OfficialRoute'
import { ModeratorRoute } from './components/auth/ModeratorRoute'
import { DisputesPage } from './pages/DisputesPage'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ToastContainer } from './components/common/ToastContainer'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Public: it is how an official without a password gets in, from a report mail. */}
          <Route path="/link" element={<LinkPage />} />
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
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          {/* Public on purpose: no ProtectedRoute, and the two endpoints it reads need no
              session. Signed in or not, anyone can see what has been reported and what the
              districts have done about it. */}
          <Route path="/reports" element={<ReportsPage />} />
          {/* Public too: published data, about the district administrations. */}
          <Route path="/districts" element={<DistrictComparisonPage />} />
          <Route
            path="/assigned"
            element={
              <OfficialRoute>
                <AssignedReportsPage />
              </OfficialRoute>
            }
          />

          <Route
            path="/disputes"
            element={
              <ModeratorRoute>
                <DisputesPage />
              </ModeratorRoute>
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
