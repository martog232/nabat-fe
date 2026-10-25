import { describe, it, expect } from 'vitest'
import { answerTimeChart, buildRows, extremes, outcomeChart, periodOptions, within30Chart } from './districtComparison'

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

describe('district comparison charts', () => {
  const districts = [
    { code: 'A', name: 'Район Алфа', population: 1000 },
    { code: 'B', name: 'Район Бета', population: 1000 },
    { code: 'C', name: 'Район Гама', population: 1000 },
  ]
  const outcomes = [
    { districtCode: 'A', signals: 10, answered: 8, medianDaysToAnswer: 4, p90DaysToAnswer: 30, dueIn30Days: 10, answeredIn30Days: 6, closed: 2, answeredOnly: 5, rejected: 1, stillOpen: 2 },
    { districtCode: 'B', signals: 10, answered: 10, medianDaysToAnswer: 5, p90DaysToAnswer: 12, dueIn30Days: 0, answeredIn30Days: 0, closed: 4, answeredOnly: 5, rejected: 1, stillOpen: 0 },
  ]
  const rows = buildRows(districts, outcomes)

  it('leaves out a district the deadline cannot judge, rather than drawing it as zero', () => {
    expect(within30Chart(rows)).toEqual([{ name: 'Алфа', pct: 60 }])
  })

  it('orders answer times by the slow tail, not the median', () => {
    expect(answerTimeChart(rows).map((p) => p.name)).toEqual(['Бета', 'Алфа'])
  })

  it('stacks counts per district with reports, fewest unanswered first', () => {
    const chart = outcomeChart(districts, outcomes)
    expect(chart.names).toEqual(['Бета', 'Алфа'])
    expect(chart.series.find((s) => s.name === 'Без отговор')!.data).toEqual([0, 2])
  })
})
