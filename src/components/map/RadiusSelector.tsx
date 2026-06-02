import { useEffect, useRef } from 'react'
import { userApi } from '../../api/user'
import { useAlertStore } from '../../store/alertStore'
import { useToastStore } from '../../store/toastStore'

const RADIUS_OPTIONS = [1, 5, 10, 25, 50] as const
const SAVE_DEBOUNCE_MS = 800

export function RadiusSelector() {
  const radiusKm = useAlertStore((s) => s.radiusKm)
  const userLat = useAlertStore((s) => s.userLat)
  const userLng = useAlertStore((s) => s.userLng)
  const setRadiusKm = useAlertStore((s) => s.setRadiusKm)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestSeqRef = useRef(0)

  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleSelect = (value: number) => {
    if (value === radiusKm) return

    const previousRadius = radiusKm
    setRadiusKm(value)
    requestSeqRef.current += 1
    const currentRequest = requestSeqRef.current

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      void userApi.updatePreferences({
        notificationRadiusKm: value,
        lastKnownLat: userLat,
        lastKnownLng: userLng,
      }).catch(() => {
        if (requestSeqRef.current !== currentRequest) return

        setRadiusKm(previousRadius)
        useToastStore.getState().addToast({
          type: 'error',
          message: 'Could not save alert radius. Reverted to the previous value.',
        })
      })
    }, SAVE_DEBOUNCE_MS)
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated p-2">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-300 mb-2 px-1">Alert radius</p>
      <div className="flex items-center gap-1">
        {RADIUS_OPTIONS.map((value) => {
          const isActive = value === radiusKm
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleSelect(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-DEFAULT text-slate-600 dark:text-slate-300 hover:bg-surface-hover'
              }`}
            >
              {value} km
            </button>
          )
        })}
      </div>
    </div>
  )
}
