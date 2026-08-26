import { describe, it, expect } from 'vitest'
import { canAdministerUsers, canModerateContent, canResolveAlert } from './permissions'
import type { Alert, User } from '../types'

const user = (id: string, role: User['role']): User => ({
  id,
  email: `${id}@example.com`,
  displayName: id,
  role,
})

const alert = (reportedBy: string, status: Alert['status'] = 'ACTIVE'): Alert => ({
  id: 'alert-1',
  title: 'Fire',
  description: 'Smoke on the third floor',
  type: 'FIRE',
  severity: 'HIGH',
  latitude: 42.7,
  longitude: 23.3,
  createdAt: '2026-08-21T05:00:00Z',
  status,
  reportedBy,
  upvoteCount: 0,
  downvoteCount: 0,
  confirmationCount: 0,
  credibilityScore: 0,
  resolvedAt: status === 'RESOLVED' ? '2026-08-21T06:00:00Z' : null,
})

describe('capabilities', () => {
  it('separates moderating content from administering accounts', () => {
    expect(canModerateContent('USER')).toBe(false)
    expect(canModerateContent('MODERATOR')).toBe(true)
    expect(canModerateContent('ADMIN')).toBe(true)

    expect(canAdministerUsers('USER')).toBe(false)
    expect(canAdministerUsers('MODERATOR')).toBe(false)
    expect(canAdministerUsers('ADMIN')).toBe(true)
  })

  it('treats an absent role as no capability at all', () => {
    expect(canModerateContent(undefined)).toBe(false)
    expect(canAdministerUsers(undefined)).toBe(false)
  })
})

describe('canResolveAlert', () => {
  it('lets the reporter close their own alert', () => {
    expect(canResolveAlert(user('u1', 'USER'), alert('u1'))).toBe(true)
  })

  it('does not let a plain user close someone else\'s', () => {
    expect(canResolveAlert(user('u1', 'USER'), alert('u2'))).toBe(false)
  })

  /** The case the old `role === 'ADMIN'` check got wrong: this is what the role is for. */
  it('lets a moderator close anyone\'s alert', () => {
    expect(canResolveAlert(user('m1', 'MODERATOR'), alert('u2'))).toBe(true)
  })

  it('lets an admin close anyone\'s alert', () => {
    expect(canResolveAlert(user('a1', 'ADMIN'), alert('u2'))).toBe(true)
  })

  /** `Alert.resolve()` is deliberately not idempotent server-side; offering it again is a 409. */
  it('offers nothing on an already-resolved alert', () => {
    expect(canResolveAlert(user('a1', 'ADMIN'), alert('a1', 'RESOLVED'))).toBe(false)
  })

  it('offers nothing to an anonymous visitor', () => {
    expect(canResolveAlert(null, alert('u1'))).toBe(false)
  })
})
