import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useDistricts } from '../hooks/useDistricts'
import { useDistrictComparison } from '../hooks/useDistrictComparison'
import {
  buildRows,
  extremes,
  periodOptions,
  sortRows,
  type ColumnKey,
  type ComparisonRow,
} from '../utils/districtComparison'
import type { ComparisonPeriod } from '../types'

interface Column {
  key: ColumnKey
  label: string
  format: (v: number) => string
}

const days = (v: number) => v.toLocaleString('bg-BG', { maximumFractionDigits: 1 })
const percent = (v: number) => `${Math.round(v)}%`

const COLUMNS: Column[] = [
  { key: 'signals', label: 'Сигнали', format: (v) => v.toLocaleString('bg-BG') },
  { key: 'perThousand', label: 'На 1000 жители', format: (v) => v.toLocaleString('bg-BG', { maximumFractionDigits: 1 }) },
  { key: 'medianDays', label: 'Медиана до отговор (дни)', format: days },
  { key: 'p90Days', label: '90% са отговорени до (дни)', format: days },
  { key: 'within30Pct', label: 'Отговорени до 30 дни', format: percent },
  { key: 'closedPct', label: 'Приключени', format: percent },
  { key: 'answeredOnlyPct', label: 'Само уведомени', format: percent },
  { key: 'rejectedPct', label: 'Отхвърлени', format: percent },
  { key: 'stillOpenPct', label: 'Без отговор', format: percent },
]

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Sofia's districts side by side, on how they answered Call Sofia reports.
 *
 * Public, like the list of reports: the figures are about administrations, from published
 * data. The box above the table is not decoration — "answered" here is a word to the
 * citizen, not a fix, and a table without that said would claim more than the data does.
 */
export function DistrictComparisonPage() {
  const user = useAuthStore((s) => s.user)
  const [periodKey, setPeriodKey] = useState('last12')
  const [sort, setSort] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' }>({
    key: 'within30Pct',
    direction: 'asc',
  })

  const { data: districts = [] } = useDistricts()
  const [period, setPeriod] = useState<ComparisonPeriod>({})
  const { data, isLoading, isError, isFetching } = useDistrictComparison(period)
  // Every answer carries the archive's span, and the previous one stays on screen while the
  // next loads, so the years on offer do not flicker away on a change of period.
  const options = periodOptions(data?.archiveFrom ?? null, data?.archiveTo ?? null)
  const option = options.find((o) => o.key === periodKey) ?? options[0]
  const choosePeriod = (key: string) => {
    setPeriodKey(key)
    setPeriod(options.find((o) => o.key === key)?.period ?? {})
  }

  const rows = useMemo(
    () => sortRows(buildRows(districts, data?.districts ?? []), sort.key, sort.direction),
    [districts, data, sort],
  )
  const marks = useMemo(
    () => Object.fromEntries(COLUMNS.map((c) => [c.key, extremes(rows, c.key)])) as Record<ColumnKey, ReturnType<typeof extremes>>,
    [rows],
  )

  const sortBy = (key: ColumnKey) =>
    setSort((s) => (s.key === key ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }))

  const noArchive = data != null && data.archiveFrom == null

  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT">
      <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Как отговарят районите</h1>
            <p className="text-sm text-slate-600">
              Колко бързо и как районите на София отговарят на сигналите, подадени в Call Sofia.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/reports"
              className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-hover"
            >
              Всички сигнали
            </Link>
            <Link
              to={user ? '/map' : '/login'}
              className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-hover"
            >
              {user ? 'Обратно към картата' : 'Вход, за да подадете сигнал'}
            </Link>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-slate-700">
          <h2 className="mb-2 font-semibold text-slate-900">Как да четете таблицата</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              „Отговор“ е първата окончателна дума към гражданина — уведомление, приключване или отхвърляне. Дори
              „Приключен“ е формално затваряне: данните не казват дали проблемът наистина е решен.
            </li>
            <li>Медианата и „90% са отговорени до“ броят само сигналите, които изобщо са получили отговор.</li>
            <li>
              „Отговорени до 30 дни“ брои само сигналите, подадени поне 30 дни преди края на архива — по-новите не са имали
              време да бъдат оценени по срока.
            </li>
            <li>„На 1000 жители“ ползва оценка за населението от 2022 г. — за сравнение, не за точен брой.</li>
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            Източник: архивът на Боян Юруков на данните от Call Sofia (CC BY-SA 2.5 BG)
            {data?.archiveTo ? `, до ${longDate(data.archiveTo)}` : ''}.{' '}
            <a
              href="https://opendata.yurukov.net/callsofia/data/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 hover:underline"
            >
              opendata.yurukov.net
            </a>
          </p>
          <p className="mt-2 text-xs">
            <Link to="/reports" className="font-medium text-brand-600 hover:underline">
              Наистина ли е оправено? — проверете сигналите в nabat
            </Link>
          </p>
        </section>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label htmlFor="period" className="text-sm font-medium text-slate-700">
            Период
          </label>
          <select
            id="period"
            value={option.key}
            onChange={(e) => choosePeriod(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-800"
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {data?.from && data?.to && (
            <span className="text-xs text-slate-500">
              {longDate(data.from)} – {longDate(addDays(data.to, -1))}
            </span>
          )}
        </div>

        {isLoading && <p className="text-sm text-slate-600">Зареждане…</p>}
        {isError && (
          <p role="alert" className="text-sm text-red-600">
            Сравнението не можа да се зареди. Проверете връзката си и опитайте отново.
          </p>
        )}
        {noArchive && (
          <p className="text-sm text-slate-600">
            Архивът на Call Sofia още не е внесен в nabat, затова няма с какво да се сравни.
          </p>
        )}
        {data && !noArchive && data.districts.length === 0 && (
          <p className="text-sm text-slate-600">Няма сигнали в архива за този период.</p>
        )}

        {data && !noArchive && data.districts.length > 0 && (
          <div className={`overflow-x-auto rounded-2xl border border-surface-border bg-surface-card shadow-sm transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs text-slate-600">
                  <th scope="col" className="sticky left-0 bg-surface-card px-3 py-3 font-semibold">
                    Район
                  </th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={sort.key === c.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className="px-3 py-3 text-right font-semibold"
                    >
                      <button
                        type="button"
                        onClick={() => sortBy(c.key)}
                        className="inline-flex items-center gap-1 whitespace-nowrap hover:text-slate-900"
                      >
                        {c.label}
                        <span aria-hidden className="text-slate-400">
                          {sort.key === c.key ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Row key={row.code} row={row} marks={marks} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ row, marks }: { row: ComparisonRow; marks: Record<ColumnKey, ReturnType<typeof extremes>> }) {
  return (
    <tr className="border-b border-surface-border last:border-b-0">
      <th scope="row" className="sticky left-0 whitespace-nowrap bg-surface-card px-3 py-2 text-left font-medium text-slate-900">
        {row.name.replace(/^Район /, '')}
      </th>
      {COLUMNS.map((c) => {
        const value = row[c.key]
        const mark = marks[c.key]
        const tone =
          value != null && mark
            ? value === mark.best
              ? 'bg-green-500/10 text-green-800'
              : value === mark.worst
                ? 'bg-amber-500/10 text-amber-800'
                : ''
            : ''
        return (
          <td key={c.key} className={`whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700 ${tone}`}>
            {value == null ? '—' : c.format(value)}
          </td>
        )
      })}
    </tr>
  )
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
