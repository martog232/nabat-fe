import type { Alert, AlertStatus, Role, User } from '../types'
import { isOpen } from '../types'

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

export function canActForAuthority(role: Role | undefined): boolean {
  return role === 'OFFICIAL'
}

/**
 * Whether this user speaks for the authority that answers for this report — its district, or
 * the institution its category belongs to. Both halves, like `User.actsFor` on the server: the
 * role says nothing about *which* reports. The authority, never the district: a bus stop in
 * Lozenets is the Centre for Urban Mobility's, not Lozenets'.
 */
export function actsForAuthorityOf(user: User | null, alert: Alert): boolean {
  return !!user
    && canActForAuthority(user.role)
    && alert.authorityCode !== null
    && user.authorityCode === alert.authorityCode
}

/**
 * Whether this user may mark this report fixed: its authority, its reporter, or a moderator.
 * Mirrors `AlertLifecycleService.resolve`. A closed report is excluded — the transition is
 * deliberately not idempotent server-side, so offering it again would produce a 409.
 */
export function canResolveAlert(user: User | null, alert: Alert): boolean {
  if (!user || !isOpen(alert.status)) return false
  return actsForAuthorityOf(user, alert)
    || alert.reportedBy === user.id
    || canModerateContent(user.role)
}

/** Closing without a fix is the authority's or a moderator's call — never the reporter's. */
export function canRejectAlert(user: User | null, alert: Alert): boolean {
  if (!user || !isOpen(alert.status)) return false
  return actsForAuthorityOf(user, alert) || canModerateContent(user.role)
}

/** The forward order of the open states, as `AlertStatus.canMoveTo` compares them. */
const OPEN_ORDER: AlertStatus[] = ['SUBMITTED', 'SENT', 'ACKNOWLEDGED', 'IN_PROGRESS']

/**
 * Whether the authority may move this report on to `target` — forward only, skipping allowed,
 * which is the server's rule. Acknowledging and starting work are the authority's alone.
 */
export function canAdvanceTo(user: User | null, alert: Alert, target: 'ACKNOWLEDGED' | 'IN_PROGRESS'): boolean {
  if (!actsForAuthorityOf(user, alert) || !isOpen(alert.status)) return false
  return OPEN_ORDER.indexOf(target) > OPEN_ORDER.indexOf(alert.status)
}

/** Human-readable label for the roles worth surfacing. USER is the default and needs none. */
export const ROLE_LABELS: Partial<Record<Role, string>> = {
  MODERATOR: 'Модератор',
  ADMIN: 'Администратор',
  OFFICIAL: 'Служител на институция',
}
