import { describe, it, expect } from 'vitest'
import { haversineDistanceM } from './geo'

describe('haversineDistanceM', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistanceM(42.6977, 23.3219, 42.6977, 23.3219)).toBe(0)
  })

  it('computes distance between Sofia and Plovdiv (~130 km)', () => {
    const d = haversineDistanceM(42.6977, 23.3219, 42.1354, 24.7453)
    // ~130 km with 5 km tolerance
    expect(d / 1000).toBeGreaterThan(125)
    expect(d / 1000).toBeLessThan(135)
  })

  it('is symmetric', () => {
    const a = haversineDistanceM(40.7128, -74.006, 48.8566, 2.3522)
    const b = haversineDistanceM(48.8566, 2.3522, 40.7128, -74.006)
    expect(a).toBeCloseTo(b, 0)
  })

  it('handles antipodal points (roughly half Earth circumference)', () => {
    const d = haversineDistanceM(0, 0, 0, 180)
    // ~20 037 km
    expect(d).toBeGreaterThan(19_900_000)
    expect(d).toBeLessThan(20_100_000)
  })
})
