import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { useAuthStore } from '../store/authStore'
import { canActForAuthority, canAdministerUsers, ROLE_LABELS } from '../utils/permissions'
import { useAuthorityNames } from '../hooks/useAuthorities'

/**
 * Everything about the account that is not the map.
 *
 * <p>It exists because the app had nowhere to put any of this: signing out lived at the
 * bottom of the alert list. The notification radius it once held went with the proximity
 * push on the backend, and the theme toggle went when the app stopped having a dark theme.
 */
export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const authorityNames = useAuthorityNames()

  if (!user) {
    return null
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT">
      <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <header className="mb-8 flex items-center gap-3">
          <Link
            to="/map"
            aria-label="Обратно към картата"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-card text-slate-600 transition-colors hover:bg-surface-hover"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Настройки</h1>
            <p className="text-sm text-slate-600">Вашият профил</p>
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
              <p className="truncate text-lg font-semibold text-slate-900">{user.displayName}</p>
              <p className="truncate text-sm text-slate-600">{user.email}</p>
            </div>
            {user.role !== 'USER' && (
              <span className="ml-auto rounded-full border border-brand-600/30 bg-brand-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                {ROLE_LABELS[user.role] ?? user.role.toLowerCase()}
              </span>
            )}
          </div>
        </section>


        {canActForAuthority(user.role) && user.authorityCode && (
          <section className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {authorityNames.get(user.authorityCode) ?? user.authorityCode}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Сигналите, изпратени до вас, и какво е направено по тях.
                </p>
              </div>
              <Link
                to="/assigned"
                className="rounded-lg border border-surface-border bg-surface-elevated px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-hover"
              >
                Отвори
              </Link>
            </div>
          </section>
        )}

        {/* Only an admin sees this, and only as a courtesy: the route redirects and every
            endpoint behind it refuses anyone else. */}
        {canAdministerUsers(user.role) && (
          <section className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Профили</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Роли и кои профили могат да влизат.
                </p>
              </div>
              <Link
                to="/admin"
                className="rounded-lg border border-surface-border bg-surface-elevated px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-hover"
              >
                Управление
              </Link>
            </div>
          </section>
        )}


        <Button
          type="button"
          variant="danger"
          className="w-full"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          Изход
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
