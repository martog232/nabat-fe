import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api/admin'
import { Button } from '../components/common/Button'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import type { Role, User } from '../types'

const PAGE_SIZE = 25
const ASSIGNABLE_ROLES: Role[] = ['USER', 'MODERATOR', 'ADMIN']

/**
 * Account administration: who has which role, and whose account is switched off.
 *
 * <p>The endpoints have existed for a while with nothing calling them, so a role could only be
 * changed with a hand-written request or an UPDATE against the database.
 *
 * <p>Nothing here is a security boundary. The server answers 403 to a non-admin and re-reads
 * the caller's current row rather than trusting the role in their token, so this page decides
 * what to render and nothing else — which is also why it does not hide itself when the store
 * says the wrong thing: the route guard does that, and the API refuses regardless.
 */
export function AdminPage() {
  const currentUser = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)

  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async (which: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.listUsers(which, PAGE_SIZE)
      setUsers(result.users)
      setTotal(result.total)
    } catch {
      setError('Could not load accounts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(page)
  }, [load, page])

  /** Replaces one row from the server's answer rather than reloading the page under the admin. */
  const replace = (updated: User) =>
    setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)))

  const changeRole = async (user: User, role: Role) => {
    setBusyId(user.id)
    try {
      replace(await adminApi.changeRole(user.id, role))
      addToast({ type: 'success', message: `${user.displayName} is now ${role.toLowerCase()}` })
    } catch {
      addToast({ type: 'error', message: `Could not change ${user.displayName}'s role` })
    } finally {
      setBusyId(null)
    }
  }

  const setEnabled = async (user: User, enabled: boolean) => {
    setBusyId(user.id)
    try {
      replace(await adminApi.setEnabled(user.id, enabled))
      addToast({
        type: 'success',
        message: enabled
          ? `${user.displayName} can sign in again`
          : `${user.displayName} is disabled and signed out`,
      })
    } catch {
      addToast({ type: 'error', message: `Could not update ${user.displayName}` })
    } finally {
      setBusyId(null)
    }
  }

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)

  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT">
      <div className="mx-auto w-full max-w-5xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <header className="mb-8 flex items-center gap-3">
          <Link
            to="/settings"
            aria-label="Back to settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-card text-slate-600 transition-colors hover:bg-surface-hover dark:text-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Accounts</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {total} {total === 1 ? 'account' : 'accounts'}, newest first
            </p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            {error}{' '}
            <button type="button" onClick={() => void load(page)} className="font-semibold underline">
              Try again
            </button>
          </div>
        )}

        {loading && users.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
        ) : (
          <ul className="space-y-3">
            {users.map((user) => {
              const isSelf = user.id === currentUser?.id
              const busy = busyId === user.id

              return (
                <li
                  key={user.id}
                  className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm sm:flex sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium text-slate-900 dark:text-white">
                      {user.displayName}
                      {isSelf && (
                        <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-normal text-slate-600 dark:text-slate-300">
                          you
                        </span>
                      )}
                      {!user.enabled && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                          disabled
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                      {user.email}
                      {!user.emailVerified && ' · unverified'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-2 sm:mt-0">
                    {/*
                      Both controls are disabled on your own row, because the server refuses
                      them: an admin who demotes or disables themselves can leave an
                      installation with nobody able to undo it, and there is no break-glass
                      path. Rendering them enabled would only produce a 403.
                    */}
                    <label className="sr-only" htmlFor={`role-${user.id}`}>
                      Role for {user.displayName}
                    </label>
                    <select
                      id={`role-${user.id}`}
                      value={user.role}
                      disabled={isSelf || busy}
                      onChange={(e) => void changeRole(user, e.target.value as Role)}
                      className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-800 disabled:opacity-50 dark:text-slate-100"
                    >
                      {ASSIGNABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0) + role.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      variant={user.enabled ? 'danger' : 'secondary'}
                      size="sm"
                      disabled={isSelf || busy}
                      onClick={() => void setEnabled(user, !user.enabled)}
                    >
                      {user.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {total > PAGE_SIZE && (
          <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Page {page + 1} of {lastPage + 1}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
    </div>
  )
}
