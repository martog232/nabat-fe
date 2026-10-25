import { useState } from 'react'
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  // Where ProtectedRoute was sending them, e.g. a report opened from a district's mail.
  const from = (useLocation().state as { from?: Location } | null)?.from
  const destination = from ? from.pathname + from.search : '/map'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate(destination, { replace: true })
    } catch {
      // error is in store
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT flex justify-center px-4 py-8 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      {/* my-auto, not items-center on the parent: a form taller than a landscape phone
          would be centred by items-center and then clipped at the top with no way to scroll
          up to it. Auto margins centre when there is room and collapse when there is not. */}
      <div className="w-full max-w-sm my-auto">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-xl shadow-brand-600/40 mb-4">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Добре дошли отново</h1>
          <p className="text-sm text-slate-600 mt-1">Влезте в профила си в Nabat</p>
        </div>

        {/* Card */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Имейл"
              type="email"
              placeholder="lozenets@rayon.nabat.test"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError() }}
              required
            />
            <Input
              label="Парола"
              type="password"
              placeholder="rayon12345"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError() }}
              required
            />

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              Вход
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-4">
            Нямате профил?{' '}
            <Link to="/register" className="text-brand-400 hover:underline font-medium">
              Регистрирайте се
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-slate-700 mt-4">
          Демо: test@example.com / admin@example.com
        </p>
        <p className="text-center text-xs text-slate-700 mt-1">
          Район: &lt;район&gt;@rayon.nabat.test, институция: cgm@institution.nabat.test / rayon12345
        </p>
      </div>
    </div>
  )
}
