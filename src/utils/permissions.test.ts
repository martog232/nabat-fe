import { describe, it, expect } from 'vitest'
import {
  actsForAuthorityOf,
  canAdministerUsers,
  canAdvanceTo,
  canModerateContent,
  canForward,
  canRejectAlert,
  canResolveAlert,
} from './permissions'
import type { Alert, User } from '../types'
import { UNCHECKED_FIX } from '../types'

const user = (id: string, role: User['role']): User => ({
  id,
  email: `${id}@example.com`,
  displayName: id,
  role,
  authorityCode: null,
  enabled: true,
  emailVerified: false,
})

const alert = (reportedBy: string, status: Alert['status'] = 'SUBMITTED'): Alert => ({
  id: 'alert-1',
  title: 'Fire',
  description: 'Smoke on the third floor',
  categoryCode: 1007,
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
  districtCode: 'LOZENETS',
  authorityCode: 'LOZENETS',
  closedBy: null,
  fixCheck: UNCHECKED_FIX,
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

describe('a district official', () => {
  const official = (authority: string): User => ({ ...user('o1', 'OFFICIAL'), authorityCode: authority })

  it('acts for their own district and no other', () => {
    expect(actsForAuthorityOf(official('LOZENETS'), alert('u2'))).toBe(true)
    expect(actsForAuthorityOf(official('TRIADITSA'), alert('u2'))).toBe(false)
  })

  /** The rule the role exists for: another district's report offers them nothing at all. */
  it('may do nothing to a report in another district', () => {
    const other = official('TRIADITSA')
    expect(canResolveAlert(other, alert('u2'))).toBe(false)
    expect(canRejectAlert(other, alert('u2'))).toBe(false)
    expect(canAdvanceTo(other, alert('u2'), 'ACKNOWLEDGED')).toBe(false)
  })

  it('moves their district\'s report forward, skipping allowed, never back', () => {
    const lozenets = official('LOZENETS')
    expect(canAdvanceTo(lozenets, alert('u2', 'SENT'), 'ACKNOWLEDGED')).toBe(true)
    expect(canAdvanceTo(lozenets, alert('u2', 'SENT'), 'IN_PROGRESS')).toBe(true)
    expect(canAdvanceTo(lozenets, alert('u2', 'IN_PROGRESS'), 'ACKNOWLEDGED')).toBe(false)
    expect(canAdvanceTo(lozenets, alert('u2', 'ACKNOWLEDGED'), 'ACKNOWLEDGED')).toBe(false)
    expect(canAdvanceTo(lozenets, alert('u2', 'RESOLVED'), 'IN_PROGRESS')).toBe(false)
  })

  it('is not a moderator', () => {
    expect(canModerateContent('OFFICIAL')).toBe(false)
  })
})

describe('canRejectAlert', () => {
  /** "Not a real problem" is the district's or a moderator's call about someone's report. */
  it('is not the reporter\'s', () => {
    expect(canRejectAlert(user('u1', 'USER'), alert('u1'))).toBe(false)
  })

  it('is a moderator\'s', () => {
    expect(canRejectAlert(user('m1', 'MODERATOR'), alert('u2'))).toBe(true)
  })

  it('is nobody\'s on a closed report', () => {
    expect(canRejectAlert(user('m1', 'MODERATOR'), alert('u2', 'REJECTED'))).toBe(false)
  })
})

describe('acknowledging and starting work', () => {
  it('belongs to the district alone — not the reporter, not a moderator', () => {
    expect(canAdvanceTo(user('u1', 'USER'), alert('u1', 'SENT'), 'ACKNOWLEDGED')).toBe(false)
    expect(canAdvanceTo(user('m1', 'MODERATOR'), alert('u2', 'SENT'), 'IN_PROGRESS')).toBe(false)
  })
})

describe('an institution', () => {
  const official = (authority: string): User => ({ ...user('o1', 'OFFICIAL'), authorityCode: authority })
  const busStop: Alert = { ...alert('u2'), authorityCode: 'CGM' }

  /** The authority, not the place: a bus stop in Lozenets is the CGM's. */
  it('acts on a report in a district because its category is theirs', () => {
    expect(actsForAuthorityOf(official('CGM'), busStop)).toBe(true)
    expect(actsForAuthorityOf(official('LOZENETS'), busStop)).toBe(false)
  })
})

describe('canForward', () => {
  const official = (authority: string): User => ({ ...user('o1', 'OFFICIAL'), authorityCode: authority })

  it('is the report\'s authority\'s or a moderator\'s, and never the reporter\'s', () => {
    expect(canForward(official('LOZENETS'), alert('u2'))).toBe(true)
    expect(canForward(user('m1', 'MODERATOR'), alert('u2'))).toBe(true)
    expect(canForward(user('u2', 'USER'), alert('u2'))).toBe(false)
    expect(canForward(official('TRIADITSA'), alert('u2'))).toBe(false)
  })

  it('is not offered on a closed report', () => {
    expect(canForward(official('LOZENETS'), alert('u2', 'RESOLVED'))).toBe(false)
  })
})
