import { describe, it, expect } from 'vitest'
import { buildRows, extremes, periodOptions } from './districtComparison'

describe('district comparison', () => {
  it('leaves per-resident figures empty without a population', () => {
    const [row] = buildRows([{ code: 'X', name: 'Район X' }], [])
    expect(row.perThousand).toBeNull()
    expect(row.signals).toBe(0)
  })

  it('marks the lower median as best', () => {
    const rows = buildRows(
      [{ code: 'A', name: 'A' }, { code: 'B', name: 'B' }],
      [
        { districtCode: 'A', signals: 1, answered: 1, medianDaysToAnswer: 5, p90DaysToAnswer: 5, dueIn30Days: 1, answeredIn30Days: 1, closed: 0, answeredOnly: 1, rejected: 0, stillOpen: 0 },
        { districtCode: 'B', signals: 1, answered: 1, medianDaysToAnswer: 20, p90DaysToAnswer: 20, dueIn30Days: 1, answeredIn30Days: 1, closed: 0, answeredOnly: 1, rejected: 0, stillOpen: 0 },
      ],
    )
    expect(extremes(rows, 'medianDays')).toEqual({ best: 5, worst: 20 })
    expect(extremes(rows, 'signals')).toBeNull()
  })

  it('offers the archive years newest first, marking the partial ones', () => {
    const labels = periodOptions('2021-12-14', '2026-08-01').map((o) => o.label)
    expect(labels[0]).toBe('Последните 12 месеца на архива')
    expect(labels[1]).toMatch(/^2026 \(до /)
    expect(labels.at(-1)).toMatch(/^2021 \(от /)
    expect(labels).toContain('2024')
  })
})
