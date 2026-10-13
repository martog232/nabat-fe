import { describe, it, expect } from 'vitest'
import { createAlertIcon } from './alertIcon'
import type { Alert } from '../../types'

const baseAlert: Alert = {
  id: 'alert-1',
  title: 'Fire on Main St',
  description: 'A fire broke out near the intersection',
  categoryCode: 1007,
  latitude: 42.7,
  longitude: 23.3,
  createdAt: new Date().toISOString(),
  status: 'SUBMITTED',
  reportedBy: 'user-1',
  upvoteCount: 5,
  downvoteCount: 1,
  confirmationCount: 3,
  credibilityScore: 10,
  resolvedAt: null,
  districtCode: 'LOZENETS',
  closedBy: null,
}

function htmlOf(isSelected: boolean) {
  const html = createAlertIcon(baseAlert, isSelected).options.html
  return typeof html === 'string' ? html : ''
}

describe('createAlertIcon', () => {
  it('draws a halo behind the pin only when the alert is selected', () => {
    expect(htmlOf(true)).toContain('alert-halo-pulse')
    expect(htmlOf(false)).not.toContain('alert-halo-pulse')
  })

  it('keeps the pin anchored on its coordinate in both states', () => {
    // The selection marker grows a disc behind the pin instead of scaling the pin,
    // precisely so the tip stays on the reported location. Pin the anchor so a later
    // change to the selected size cannot silently move every marker off its alert.
    for (const isSelected of [true, false]) {
      const icon = createAlertIcon(baseAlert, isSelected)
      expect(icon.options.iconSize).toEqual([40, 40])
      expect(icon.options.iconAnchor).toEqual([20, 40])
    }
  })

  it('tints both states from the status colour', () => {
    // #94a3b8 is SUBMITTED. A selected pin is the same hue, more opaque — not a new colour,
    // which would read as a different status.
    expect(htmlOf(false)).toContain('#94a3b822')
    expect(htmlOf(true)).toContain('#94a3b866')
  })
})
