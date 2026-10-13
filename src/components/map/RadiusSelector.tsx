import { useAlertStore } from '../../store/alertStore'

const RADIUS_OPTIONS = [1, 5, 10, 25, 50] as const

/**
 * How far around the map centre to load reports. A view setting and nothing more: it used
 * to be saved to the account as a notification radius, and the backend stopped pushing
 * reports by proximity, so there is nothing left to save it for.
 */
export function RadiusSelector() {
  const radiusKm = useAlertStore((s) => s.radiusKm)
  const setRadiusKm = useAlertStore((s) => s.setRadiusKm)

  const handleSelect = (value: number) => {
    if (value !== radiusKm) setRadiusKm(value)
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated p-2">
      <p className="text-xs font-medium text-slate-500 mb-2 px-1">Покажи в радиус</p>
      {/* Five options across 320px leaves ~55px each including gaps — enough as an
          equal-width grid, not enough with intrinsic widths, where "50 km" pushed the row
          into an overflow that had nowhere to go. */}
      <div className="grid grid-cols-5 gap-1">
        {RADIUS_OPTIONS.map((value) => {
          const isActive = value === radiusKm
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleSelect(value)}
              className={`min-h-[2.25rem] sm:min-h-[1.875rem] px-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-DEFAULT text-slate-600 hover:bg-surface-hover'
              }`}
            >
              {value} км
            </button>
          )
        })}
      </div>
    </div>
  )
}
