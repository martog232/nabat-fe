import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { ReactNode } from 'react'

/**
 * The mirror of {@link ProtectedRoute}: for pages that only make sense before signing in.
 *
 * <p>The landing page explains what Nabat is. Someone who is already signed in has answered
 * that question, and sending them to marketing when they open the app would be a step
 * backwards — so `/` takes them to the map instead.
 *
 * <p>The same pair of checks as the guard it mirrors, deliberately. Gating on `user` alone
 * would call a session live after the axios interceptor had cleared the token behind it, and
 * the two routes would then disagree about who is signed in: this one redirecting to the map,
 * that one redirecting straight back to the login screen.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (user && accessToken) return <Navigate to="/map" replace />
  return <>{children}</>
}
