import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { canActForADistrict } from '../../utils/permissions'
import type { ReactNode } from 'react'

/**
 * {@link ProtectedRoute} plus the district official role — the same shape as `AdminRoute`,
 * for the same reasons: no session goes to `/login`, a session without the role to
 * `/settings`. A courtesy, not a boundary; `GET /alerts/district` refuses anyone else.
 */
export function DistrictRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!user || !accessToken) return <Navigate to="/login" replace />
  if (!canActForADistrict(user.role)) return <Navigate to="/settings" replace />
  return <>{children}</>
}
