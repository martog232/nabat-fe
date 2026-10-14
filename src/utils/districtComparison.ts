import type { ComparisonPeriod, District, DistrictOutcomes } from '../types'

/** One table row: a district's outcomes with the ratios worked out. Null where there is nothing to divide. */
export interface ComparisonRow {
  code: string
  name: string
  signals: number
  perThousand: number | null
  medianDays: number | null
  p90Days: number | null
  /** Share answered within the 30-day deadline, of the reports the deadline can judge. */
  within30Pct: number | null
  closedPct: number | null
  answeredOnlyPct: number | null
  rejectedPct: number | null
  stillOpenPct: number | null
}

export type ColumnKey = Exclude<keyof ComparisonRow, 'code' | 'name'>

/**
 * Which way is better, for the subtle best/worst marks. Null for columns where neither end
 * is a judgement — a district with more reports is not doing worse, it may just be larger
 * or more vocal; a share of rejections can be right or wrong; and "closed" is a formal
 * closure, which the page itself says is no proof of a fix.
 */
export const BETTER: Record<ColumnKey, 'higher' | 'lower' | null> = {
  signals: null,
  perThousand: null,
  medianDays: 'lower',
  p90Days: 'lower',
  within30Pct: 'higher',
  closedPct: null,
  answeredOnlyPct: null,
  rejectedPct: null,
  stillOpenPct: 'lower',
}

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null)

/**
 * Every district, including those with no reports in the period — a district missing from
 * the table would read as an oversight, not as "nothing filed".
 */
export function buildRows(districts: District[], outcomes: DistrictOutcomes[]): ComparisonRow[] {
  const byCode = new Map(outcomes.map((o) => [o.districtCode, o]))
  return districts.map((d) => {
    const o = byCode.get(d.code)
    const signals = o?.signals ?? 0
    return {
      code: d.code,
      name: d.name,
      signals,
      perThousand: d.population ? (signals / d.population) * 1000 : null,
      medianDays: o?.medianDaysToAnswer ?? null,
      p90Days: o?.p90DaysToAnswer ?? null,
      within30Pct: o ? pct(o.answeredIn30Days, o.dueIn30Days) : null,
      closedPct: o ? pct(o.closed, signals) : null,
      answeredOnlyPct: o ? pct(o.answeredOnly, signals) : null,
      rejectedPct: o ? pct(o.rejected, signals) : null,
      stillOpenPct: o ? pct(o.stillOpen, signals) : null,
    }
  })
}

/** Sorted by one column; districts with no value for it always last, whichever the direction. */
export function sortRows(rows: ComparisonRow[], key: ColumnKey, direction: 'asc' | 'desc'): ComparisonRow[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = a[key]
    const y = b[key]
    if (x == null && y == null) return a.name.localeCompare(b.name, 'bg')
    if (x == null) return 1
    if (y == null) return -1
    return x === y ? a.name.localeCompare(b.name, 'bg') : (x - y) * sign
  })
}

/** The best and the worst value in a column, for the columns where that means something. */
export function extremes(rows: ComparisonRow[], key: ColumnKey): { best: number; worst: number } | null {
  const better = BETTER[key]
  const values = rows.map((r) => r[key]).filter((v): v is number => v != null)
  if (!better || values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (max === min) return null
  return better === 'higher' ? { best: max, worst: min } : { best: min, worst: max }
}

export interface PeriodOption {
  key: string
  label: string
  period: ComparisonPeriod
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit' })

/**
 * The archive's last twelve months, then each calendar year it covers, newest first. A year
 * the archive only partly covers says so, since its figures are not a whole year's.
 */
export function periodOptions(archiveFrom: string | null, archiveTo: string | null): PeriodOption[] {
  const options: PeriodOption[] = [{ key: 'last12', label: 'Последните 12 месеца на архива', period: {} }]
  if (!archiveFrom || !archiveTo) return options
  const first = Number(archiveFrom.slice(0, 4))
  const last = Number(archiveTo.slice(0, 4))
  for (let year = last; year >= first; year--) {
    let label = String(year)
    if (year === last && archiveTo < `${year}-12-31`) label += ` (до ${shortDate(archiveTo)})`
    else if (year === first && archiveFrom > `${year}-01-01`) label += ` (от ${shortDate(archiveFrom)})`
    options.push({ key: String(year), label, period: { from: `${year}-01-01`, to: `${year + 1}-01-01` } })
  }
  return options
}
