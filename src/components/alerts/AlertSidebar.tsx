import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNearbyAlerts } from '../../hooks/useAlerts'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useAuthStore } from '../../store/authStore'
import { useAlertStore } from '../../store/alertStore'
import { useThemeStore } from '../../store/themeStore'
import { AlertCard } from './AlertCard'
import { AlertFilters } from './AlertFilters'
import type { AlertSeverity, AlertType } from '../../types'
import { RadiusSelector } from '../map/RadiusSelector'

type SeverityFilter = AlertSeverity | 'ALL'

/**
 * The alert list, in two shapes.
 *
 * On a desktop it is a left panel over the map, open by default — there is room for both.
 * On a phone it is a bottom sheet that starts collapsed to a peek bar, because a 320px panel
 * on a 360px screen is not a panel over a map, it is a panel instead of one.
 *
 * The two shapes share one open/closed state and one list; what differs is which edge it
 * slides from, and that is expressed in Tailwind breakpoints. Only the parts CSS cannot
 * decide — what the initial state is, and that opening an alert on a phone gets the list out
 * of the way — go through `useIsDesktop`.
 */
export function AlertSidebar() {
  const { data: alerts = [], isLoading, isFetching } = useNearbyAlerts()
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<AlertType | 'ALL'>('ALL')
  const isDesktop = useIsDesktop()
  const [isOpen, setIsOpen] = useState(isDesktop)
  const selectedAlertId = useAlertStore((s) => s.selectedAlertId)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const navigate = useNavigate()

  // Follow the breakpoint when it changes — rotating a phone into landscape, or dragging a
  // desktop window narrow, should land on that layout's default rather than keeping a state
  // that made sense for the other one.
  useEffect(() => {
    setIsOpen(isDesktop)
  }, [isDesktop])

  // On a phone the detail sheet and the list sheet occupy the same space, so opening an
  // alert collapses the list. On a desktop they sit on opposite sides and both stay.
  useEffect(() => {
    if (!isDesktop && selectedAlertId) setIsOpen(false)
  }, [isDesktop, selectedAlertId])

  const filtered = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false
    if (typeFilter !== 'ALL' && a.type !== typeFilter) return false
    return true
  })

  return (
    <>
      {/* Desktop edge toggle. Hidden on phones, where the sheet's own header is the handle
          and an arrow pinned to the screen edge would sit under the thumb. */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Collapse alert list' : 'Expand alert list'}
        className={`
          hidden md:flex absolute top-16 z-[1000] items-center gap-2 px-3 py-2
          bg-surface-card/90 backdrop-blur border border-surface-border rounded-r-xl
          text-sm font-medium text-slate-700 dark:text-slate-300
          hover:text-slate-900 dark:hover:text-white transition-all duration-300
          ${isOpen ? 'md:left-80 lg:left-96' : 'left-0'}
        `}
      >
        {isOpen ? '◀' : '▶'}
        {!isOpen && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            {alerts.length}
          </span>
        )}
      </button>

      {/*
        Phone: a bottom sheet, full width, capped at 70dvh so the map stays visible above it.
        Collapsed it is pushed down by its own height less the peek, which keeps the header
        reachable. Desktop: a full-height left panel that slides out sideways instead.

        Note the ordering of the transform classes — `md:translate-y-0` comes last so it wins
        over the phone's translate-y at the md breakpoint regardless of open state.
      */}
      <div
        className={`
          absolute z-[999] flex flex-col
          bg-surface-DEFAULT/95 backdrop-blur-xl transition-transform duration-300
          inset-x-0 bottom-0 h-[70dvh] max-h-[70dvh]
          rounded-t-2xl border-t border-surface-border shadow-2xl
          ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-var(--sheet-peek))]'}
          md:inset-y-0 md:bottom-auto md:left-0 md:right-auto md:h-full md:max-h-none
          md:w-80 lg:w-96 md:rounded-none md:border-t-0 md:border-r md:border-surface-border
          ${isOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}
          md:translate-y-0
        `}
      >
        {/* Sheet handle — the whole bar is the tap target on a phone, so the sheet can be
            opened without aiming. Inert on desktop, where the edge toggle does this. */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          className="md:hidden flex items-center justify-between gap-3 w-full px-4 pt-3 pb-2 min-h-[var(--sheet-peek)] text-left"
        >
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isFetching ? 'bg-amber-500 animate-pulse' : 'bg-brand-500'}`} />
            <span className="font-bold text-slate-900 dark:text-white">
              {filtered.length} {filtered.length === 1 ? 'alert' : 'alerts'} nearby
            </span>
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-lg leading-none">
            {isOpen ? '▾' : '▴'}
          </span>
        </button>

        {/* Header. The top padding clears the floating navbar on desktop only — on a phone
            the sheet is at the bottom and the navbar is nowhere near it. */}
        <div className="px-4 pb-3 md:pt-16 border-b border-surface-border">
          <div className="hidden md:flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white">Live Alerts</h2>
              {isFetching && (
                <svg className="animate-spin h-3.5 w-3.5 text-brand-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
            </div>
            <span className="px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 text-xs font-bold">
              {filtered.length}
            </span>
          </div>

          <AlertFilters
            severityFilter={severityFilter}
            typeFilter={typeFilter}
            onSeverityChange={setSeverityFilter}
            onTypeChange={setTypeFilter}
          />

          <div className="mt-3">
            <RadiusSelector />
          </div>
        </div>

        {/* Alert list. overscroll-contain keeps a flick at the end of the list from scrolling
            the page behind the sheet. */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-surface-elevated animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-600 dark:text-slate-500">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-sm font-medium">No alerts in this area</p>
              <p className="text-xs mt-1">Move the map to explore other areas</p>
            </div>
          ) : (
            filtered.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </div>

        {/* Footer: theme, identity, sign out. The bottom padding clears the home-indicator
            area on a phone; env() resolves to 0 everywhere else. */}
        <div className="border-t border-surface-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex-shrink-0 w-11 h-11 md:w-8 md:h-8 rounded-full flex items-center justify-center bg-surface-elevated hover:bg-surface-hover transition-colors text-base"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-none mb-0.5">Signed in as</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-none">
              {user?.displayName ?? user?.email ?? '—'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => { logout(); navigate('/login') }}
            title="Sign out"
            aria-label="Sign out"
            className="flex-shrink-0 w-11 h-11 md:w-8 md:h-8 rounded-full flex items-center justify-center bg-surface-elevated hover:bg-red-500/20 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
