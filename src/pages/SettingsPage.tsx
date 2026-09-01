import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userApi } from '../api/user'
import { Button } from '../components/common/Button'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { NOTIFICATION_RADII_KM } from '../types'
import { canAdministerUsers } from '../utils/permissions'

/**
 * Everything about the account that is not the map.
 *
 * <p>It exists because the app had nowhere to put any of this. The notification radius has a
 * backend endpoint that no component called, so the setting was unreachable; the theme toggle
 * appeared on the sign-in screens and nowhere after them, so it could not be changed once you
 * were in; and signing out lived at the bottom of the alert list.
 */
export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const applyUserChanges = useAuthStore((s) => s.applyUserChanges)
  const logout = useAuthStore((s) => s.logout)
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const [savingRadius, setSavingRadius] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return null
  }

  const saveRadius = async (km: number) => {
    if (km === user.notificationRadiusKm) {
      return
    }

    setSavingRadius(km)
    setError(null)
    try {
      const saved = await userApi.updatePreferences({ notificationRadiusKm: km })
      // The response is the new truth, not the value that was clicked.
      applyUserChanges({ notificationRadiusKm: saved.notificationRadiusKm })
    } catch {
      setError('That could not be saved. Check your connection and try again.')
    } finally {
      setSavingRadius(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT">
      <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <header className="mb-8 flex items-center gap-3">
          <Link
            to="/map"
            aria-label="Back to the map"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-card text-slate-600 transition-colors hover:bg-surface-hover dark:text-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Your account and how Nabat reaches you</p>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-lg font-semibold text-white shadow-lg shadow-brand-600/30"
            >
              {initialsOf(user.displayName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">{user.displayName}</p>
              <p className="truncate text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
            </div>
            {user.role !== 'USER' && (
              <span className="ml-auto rounded-full border border-brand-600/30 bg-brand-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                {user.role.toLowerCase()}
              </span>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Notification radius</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            How close an alert has to be before we tell you about it.
          </p>

          {/* Five choices rather than a slider: the backend accepts exactly these and answers
              400 to anything between them. */}
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Notification radius">
            {NOTIFICATION_RADII_KM.map((km) => {
              const selected = km === user.notificationRadiusKm
              return (
                <button
                  key={km}
                  type="button"
                  onClick={() => saveRadius(km)}
                  disabled={savingRadius !== null}
                  aria-pressed={selected}
                  className={`min-w-[4.5rem] rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                    selected
                      ? 'border-brand-600 bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                      : 'border-surface-border bg-surface-elevated text-slate-700 hover:bg-surface-hover dark:text-slate-200'
                  }`}
                >
                  {savingRadius === km ? '…' : `${km} km`}
                </button>
              )
            })}
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </section>

        {/* Only an admin sees this, and only as a courtesy: the route redirects and every
            endpoint behind it refuses anyone else. */}
        {canAdministerUsers(user.role) && (
          <section className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Accounts</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Roles, and which accounts may sign in.
                </p>
              </div>
              <Link
                to="/admin"
                className="rounded-lg border border-surface-border bg-surface-elevated px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-hover dark:text-slate-200"
              >
                Manage
              </Link>
            </div>
          </section>
        )}

        <section className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Appearance</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Currently {theme === 'dark' ? 'dark' : 'light'}.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={toggleTheme}>
              Switch to {theme === 'dark' ? 'light' : 'dark'}
            </Button>
          </div>
        </section>

        <Button
          type="button"
          variant="danger"
          className="w-full"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  )
}

/** At most two letters, so the avatar stays a circle rather than a lozenge. */
function initialsOf(displayName: string): string {
  const letters = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  return letters || displayName.slice(0, 1).toUpperCase() || '?'
}
