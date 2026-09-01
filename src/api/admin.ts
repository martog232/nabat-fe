import type { AdminUserPage, Role, User } from '../types'
import { apiClient } from './client'

/**
 * The account administration endpoints. Every one of them answers 403 to anyone but an admin,
 * and re-checks the caller's current row rather than trusting the role in their token — so a
 * screen that hides these buttons is a courtesy, not the guard.
 */
export const adminApi = {
  /** One page of accounts, newest first. The server caps `size` at 100 whatever is asked. */
  listUsers: (page = 0, size = 25) =>
    apiClient
      .get<AdminUserPage>('/admin/users', { params: { page, size } })
      .then((r) => r.data),

  changeRole: (id: string, role: Role) =>
    apiClient.patch<User>(`/admin/users/${id}/role`, { role }).then((r) => r.data),

  /**
   * Disabling ends the account's sessions at once — the backend bumps its token version, so
   * requests and WebSocket handshakes with tokens already issued stop being accepted. Enabling
   * deliberately does not, so someone re-enabled seconds later is not also signed out.
   */
  setEnabled: (id: string, enabled: boolean) =>
    apiClient.patch<User>(`/admin/users/${id}/enabled`, { enabled }).then((r) => r.data),
}
