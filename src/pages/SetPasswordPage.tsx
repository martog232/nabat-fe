import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'

/**
 * Where an invitation lands: `/set-password?token=…`. An official invited by their authority
 * sets the password of the account made for them, then signs in with it. The same endpoint
 * resets a forgotten password, which takes the same two things.
 */
export function SetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'failed'>('idle')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('saving')
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: password })
      setState('done')
    } catch {
      setState('failed')
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-surface-DEFAULT px-4">
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Задайте парола</h1>
        {state === 'done' ? (
          <>
            <p className="mb-4 text-sm text-slate-600">Паролата е зададена.</p>
            <Link to="/login" className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
              Към входа
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-slate-600">Поне 10 знака, с буква и цифра.</p>
            <Input
              label="Нова парола"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {(state === 'failed' || !token) && (
              <p role="alert" className="text-sm text-red-500">
                {token ? 'Линкът не е валиден или е изтекъл, или паролата е твърде слаба.' : 'Липсва линк от покана.'}
              </p>
            )}
            <Button type="submit" className="w-full" isLoading={state === 'saving'} disabled={!token || password.length < 10}>
              Запази
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
