import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Where the "Отговори" button in a report mail lands: `/link?key=…&alert=…`.
 *
 * Trades the key for a session of the authority's own account and opens the report, so an
 * official answers without a password they were never given. The key is taken out of the
 * address before anything else, so it does not stay in the browser's history or travel in a
 * Referer. A key that no longer works ends on the login page, aimed at the same report.
 */
export function LinkPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const signInWithLink = useAuthStore((s) => s.signInWithLink)
  const [failed, setFailed] = useState(false)
  // Once: React may run an effect twice in development, and the key is the same both times.
  const started = useRef(false)

  const key = params.get('key')
  const alert = params.get('alert')
  const reportPath = alert ? `/map?alert=${encodeURIComponent(alert)}` : '/map'

  useEffect(() => {
    if (started.current) return
    started.current = true
    window.history.replaceState(null, '', '/link')

    if (!key) {
      setFailed(true)
      return
    }
    signInWithLink(key)
      .then(() => navigate(reportPath, { replace: true }))
      .catch(() => setFailed(true))
  }, [key, reportPath, navigate, signInWithLink])

  return (
    <div className="flex h-full items-center justify-center bg-surface-DEFAULT px-4">
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface-card p-6 text-center shadow-xl">
        {failed ? (
          <>
            <p className="font-semibold text-slate-900">Линкът не е валиден или е изтекъл.</p>
            <p className="mt-2 text-sm text-slate-600">Влезте с акаунта на институцията, за да отговорите.</p>
            <Link
              to="/login"
              state={{ from: { pathname: '/map', search: alert ? `?alert=${encodeURIComponent(alert)}` : '' } }}
              className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Към входа
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-600">Влизане…</p>
        )}
      </div>
    </div>
  )
}
