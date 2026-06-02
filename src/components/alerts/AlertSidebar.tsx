import { useAlertStore } from '../../store/alertStore'
import { useNearbyAlerts } from '../../hooks/useAlerts'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { AlertCard } from './AlertCard'
import type { AlertSeverity, AlertType } from '../../types'
import { ALERT_TYPE_LABELS, ALERT_TYPE_ICONS } from '../../types'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RadiusSelector } from '../map/RadiusSelector'

type SeverityFilter = AlertSeverity | 'ALL'

export function AlertSidebar() {
  const { alerts } = useAlertStore()
  const { isLoading, isFetching } = useNearbyAlerts()
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<AlertType | 'ALL'>('ALL')
  const [isOpen, setIsOpen] = useState(true)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const navigate = useNavigate()

  const filtered = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false
    if (typeFilter !== 'ALL' && a.type !== typeFilter) return false
    return true
  })

  const severities: SeverityFilter[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`
          absolute top-16 z-[1000] flex items-center gap-2 px-3 py-2
          bg-surface-card/90 backdrop-blur border border-surface-border rounded-r-xl
          text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-300
          ${isOpen ? 'left-80' : 'left-0'}
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

      {/* Sidebar panel */}
      <div
        className={`
          absolute top-0 bottom-0 left-0 z-[999] w-80
          bg-surface-DEFAULT/95 backdrop-blur-xl border-r border-surface-border
          flex flex-col transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="pt-16 pb-3 px-4 border-b border-surface-border">
          <div className="flex items-center justify-between mb-3">
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

          {/* Severity pills */}
          <div className="flex gap-1.5 flex-wrap">
            {severities.map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`
                  px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer
                  ${severityFilter === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-elevated text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }
                `}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Radius selector */}
          <div className="mt-3">
            <RadiusSelector />
          </div>
        </div>

        {/* Type filter scrollable row */}
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto border-b border-surface-border">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${typeFilter === 'ALL' ? 'bg-brand-600 text-white' : 'bg-surface-elevated text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            All types
          </button>
          {(Object.keys(ALERT_TYPE_LABELS) as AlertType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${typeFilter === t ? 'bg-brand-600 text-white' : 'bg-surface-elevated text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <span>{ALERT_TYPE_ICONS[t]}</span>
              <span>{ALERT_TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
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

        {/* Footer: theme toggle + user + logout */}
        <div className="border-t border-surface-border px-4 py-3 flex items-center gap-3">
          {/* Night mode toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-surface-elevated hover:bg-surface-hover transition-colors text-base"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Username */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-none mb-0.5">Signed in as</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-none">
              {user?.displayName ?? user?.email ?? '—'}
            </p>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={() => { logout(); navigate('/login') }}
            title="Sign out"
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-surface-elevated hover:bg-red-500/20 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors text-base"
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
