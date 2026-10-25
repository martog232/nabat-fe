import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { canModerateContent } from '../../utils/permissions'
import type { ReactNode } from 'react'

/**
 * {@link ProtectedRoute} plus content moderation — the same shape as `AdminRoute`, for the same
 * reasons. A courtesy, not a boundary; `GET /alerts/disputed` refuses anyone else.
 */
export function ModeratorRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!user || !accessToken) return <Navigate to="/login" replace />
  if (!canModerateContent(user.role)) return <Navigate to="/settings" replace />
  return <>{children}</>
}
