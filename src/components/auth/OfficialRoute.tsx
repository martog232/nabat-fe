import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { canActForAuthority } from '../../utils/permissions'
import type { ReactNode } from 'react'

/**
 * {@link ProtectedRoute} plus the official role — the same shape as `AdminRoute`,
 * for the same reasons: no session goes to `/login`, a session without the role to
 * `/settings`. A courtesy, not a boundary; `GET /alerts/assigned` refuses anyone else.
 */
export function OfficialRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!user || !accessToken) return <Navigate to="/login" replace />
  if (!canActForAuthority(user.role)) return <Navigate to="/settings" replace />
  return <>{children}</>
}
