import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import type { District, DistrictOutcomes } from '../../types'
import {
  answerTimeChart,
  outcomeChart,
  within30Chart,
  type ComparisonRow,
} from '../../utils/districtComparison'

// ApexCharts hands a tooltip null for a point with no value; there is none to print.
const number = (v: number | null, digits = 1) =>
  v == null ? '—' : v.toLocaleString('bg-BG', { maximumFractionDigits: digits })

/** One row per district, so the height follows the count rather than squeezing 24 bars into a fixed box. */
const heightFor = (bars: number) => Math.max(160, bars * 26 + 70)

/**
 * Shared by all three. No toolbar and no animation: these are read, not explored, and a bar
 * that grows into place on every change of period makes two periods harder to compare.
 */
const base: ApexOptions = {
  chart: { toolbar: { show: false }, animations: { enabled: false }, fontFamily: 'Inter, system-ui, sans-serif' },
  grid: { borderColor: '#e2e8f0' },
  legend: { position: 'top', horizontalAlign: 'left' },
}

interface Props {
  rows: ComparisonRow[]
  districts: District[]
  outcomes: DistrictOutcomes[]
}

/**
 * The comparison table drawn three ways, for what a table makes hard to see: who misses the
 * deadline, that the districts differ in their slow tail rather than their median, and how
 * the reports ended. The table stays below for the exact figures.
 *
 * A default export because the page loads it lazily: ApexCharts is most of a megabyte, and
 * the map, which is what people open the app for, should not pay for it.
 */
export default function DistrictCharts({ rows, districts, outcomes }: Props) {
  const within30 = within30Chart(rows)
  const answerTime = answerTimeChart(rows)
  const ended = outcomeChart(districts, outcomes)

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      {within30.length > 0 && (
        <Figure
          title="Отговорени до 30 дни"
          caption="Делът на сигналите, получили отговор в срока — от тези, които срокът може да оцени."
        >
          <Chart
            type="bar"
            height={heightFor(within30.length)}
            series={[{ name: 'Отговорени до 30 дни', data: within30.map((p) => p.pct) }]}
            options={{
              ...base,
              plotOptions: { bar: { horizontal: true, barHeight: '70%' } },
              colors: ['#0f766e'],
              xaxis: {
                categories: within30.map((p) => p.name),
                min: 0,
                max: 100,
                labels: { formatter: (v) => `${Math.round(Number(v))}%` },
              },
              dataLabels: { enabled: true, formatter: (v) => `${Math.round(Number(v))}%` },
              tooltip: { y: { formatter: (v) => `${number(v)}%` } },
            }}
          />
        </Figure>
      )}

      {answerTime.length > 0 && (
        <Figure
          title="Дни до отговор: медиана до 90%"
          caption="Лентата започва от медианата и стига до срока, в който са отговорени 9 от 10 сигнала. Медианите са близки — разликата е в бавните."
        >
          <Chart
            type="rangeBar"
            height={heightFor(answerTime.length)}
            series={[
              {
                name: 'Медиана – 90%',
                data: answerTime.map((p) => ({ x: p.name, y: [p.median, p.p90] })),
              },
            ]}
            options={{
              ...base,
              plotOptions: { bar: { horizontal: true, barHeight: '60%' } },
              colors: ['#f59e0b'],
              xaxis: { labels: { formatter: (v) => number(Number(v), 0) }, title: { text: 'дни' } },
              dataLabels: { enabled: false },
              tooltip: {
                custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
                  const p = answerTime[dataPointIndex]
                  return `<div class="px-3 py-2 text-xs"><strong>${p.name}</strong><br/>медиана ${number(p.median)} дни<br/>90% до ${number(p.p90)} дни</div>`
                },
              },
            }}
          />
        </Figure>
      )}

      {ended.names.length > 0 && (
        <Figure
          title="Как са приключили сигналите"
          caption="„Приключен“ е формално затваряне — не доказателство, че проблемът е решен."
          wide
        >
          <Chart
            type="bar"
            height={heightFor(ended.names.length)}
            series={ended.series}
            options={{
              ...base,
              chart: { ...base.chart, stacked: true, stackType: '100%' },
              plotOptions: { bar: { horizontal: true, barHeight: '70%' } },
              // Neutral for the three kinds of answer, amber only for no answer at all: the
              // one ending that is plainly a failure. Closed is not green, for the reason
              // the caption gives.
              colors: ['#0f766e', '#5eead4', '#94a3b8', '#f59e0b'],
              xaxis: { categories: ended.names, labels: { formatter: (v) => `${Math.round(Number(v))}%` } },
              dataLabels: { enabled: false },
              tooltip: { y: { formatter: (v) => `${number(v, 0)} сигнала` } },
            }}
          />
        </Figure>
      )}
    </div>
  )
}

function Figure({ title, caption, wide, children }: { title: string; caption: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <figure className={`rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm ${wide ? 'lg:col-span-2' : ''}`}>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <figcaption className="mb-2 text-xs text-slate-600">{caption}</figcaption>
      {children}
    </figure>
  )
}
