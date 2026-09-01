import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { canAdministerUsers } from '../../utils/permissions'
import type { ReactNode } from 'react'

/**
 * {@link ProtectedRoute} plus the one capability the admin screen needs.
 *
 * <p>Redirects rather than rendering a refusal, and to two different places on purpose: no
 * session goes to `/login`, because signing in is the answer; a session without the role goes
 * to `/settings`, because signing in again will not help and a dead end is worse than a page
 * they can use.
 *
 * <p>A courtesy, not a boundary. `canAdministerUsers` reads the role in a token that is only
 * as fresh as the last sign-in, so an admin demoted a minute ago still passes this — and is
 * then refused by every request the page makes, because the server re-reads their current row.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!user || !accessToken) return <Navigate to="/login" replace />
  if (!canAdministerUsers(user.role)) return <Navigate to="/settings" replace />
  return <>{children}</>
}
