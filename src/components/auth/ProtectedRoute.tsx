import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { ReactNode } from 'react'

/**
 * Gates a route on there being a session.
 *
 * Checks for a user *and* an access token. Gating on `user` alone was inconsistent
 * with the rest of the app: the axios interceptor clears `accessToken` when a refresh
 * fails, so a dead session still rendered protected routes until the next request
 * happened to 401.
 *
 * The page asked for travels to `/login` as `state.from`, and the login page returns to it.
 * The "Отговори" button in a district's report mail opens `/map?alert=…`; an official who
 * signs in from there has to land on that report, not on an empty map.
 *
 * This is a UX guard, not a security boundary — the API authorises every request
 * independently, so a tampered store gets a 401, not access.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (!user || !accessToken) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}
