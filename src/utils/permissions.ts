import type { Alert, Role, User } from '../types'

/**
 * The client-side mirror of the backend's `Role` capabilities.
 *
 * This decides what to *show*, never what is allowed: the server re-checks every one of
 * these, and the token's role is only as fresh as the last sign-in. Hiding a button the
 * server would refuse is a courtesy; showing one it would accept is the actual requirement,
 * which is why these read the same way round as the backend's methods.
 *
 * Named capabilities rather than `role === 'ADMIN'` comparisons scattered through the
 * components, for the same reason the backend does it: the previous single check lived in
 * `AlertDetail` and meant a moderator — a role that exists precisely to close other people's
 * alerts — would not have been shown the button.
 */
export function canModerateContent(role: Role | undefined): boolean {
  return role === 'MODERATOR' || role === 'ADMIN'
}

export function canAdministerUsers(role: Role | undefined): boolean {
  return role === 'ADMIN'
}

/**
 * Whether this user may close this alert: their own, or anyone's if they moderate.
 *
 * Mirrors `AlertLifecycleService.resolve`. An already-resolved alert is excluded here too —
 * `Alert.resolve()` is deliberately not idempotent server-side, so offering the button again
 * would produce a 409.
 */
export function canResolveAlert(user: User | null, alert: Alert): boolean {
  if (!user) return false
  if (alert.status !== 'ACTIVE') return false
  return alert.reportedBy === user.id || canModerateContent(user.role)
}

/** Human-readable label for the roles worth surfacing. USER is the default and needs none. */
export const ROLE_LABELS: Partial<Record<Role, string>> = {
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
}
