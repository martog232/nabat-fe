import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { useToastStore } from '../../store/toastStore'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../types'

const MEMBERS_KEY = ['authority', 'members'] as const

/**
 * The authority's own staff, for its own account — the one that signs in with its mailbox.
 * Each colleague gets an account of their own, so what they do is on record under their name
 * rather than the authority's shared one.
 *
 * Only that account may list or change members, and the server answers anyone else 403 — so
 * this renders nothing on a 403, rather than asking the client to know which account is which.
 */
export function AuthorityMembers() {
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { data: members, isError } = useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: () => apiClient.get<User[]>('/authority/members').then((r) => r.data),
    retry: false,
  })
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  const toast = (type: 'success' | 'error', message: string) => useToastStore.getState().addToast({ type, message })
  const invite = useMutation({
    mutationFn: () => apiClient.post<User>('/authority/members', { email: email.trim(), displayName: name.trim() }),
    onSuccess: () => {
      toast('success', `Поканата до ${email.trim()} е изпратена.`)
      setEmail('')
      setName('')
    },
    onError: () => toast('error', 'Поканата не можа да бъде изпратена. Адресът може вече да има акаунт.'),
    onSettled: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/authority/members/${id}`),
    onSuccess: () => toast('success', 'Служителят вече не действа за институцията.'),
    onError: () => toast('error', 'Служителят не можа да бъде премахнат.'),
    onSettled: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })

  if (isError || !members) return null

  return (
    <section className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-slate-900">Служители</h2>
      <p className="mb-3 text-xs text-slate-600">
        Всеки с акаунт на свое име, за да се вижда кой какво е направил по сигналите.
      </p>
      <ul className="mb-4 divide-y divide-surface-border text-sm">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2">
            <span>
              <span className="font-medium text-slate-900">{m.displayName}</span>
              <span className="ml-2 text-xs text-slate-500">{m.email}</span>
              {m.id === me?.id && <span className="ml-2 text-xs text-slate-500">(общ акаунт)</span>}
              {!m.emailVerified && <span className="ml-2 text-xs text-amber-600">поканен</span>}
            </span>
            {m.id !== me?.id && (
              <button
                type="button"
                onClick={() => remove.mutate(m.id)}
                disabled={remove.isPending}
                className="text-xs font-medium text-rose-500 hover:underline disabled:opacity-60"
              >
                Премахни
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => { e.preventDefault(); if (email.trim() && name.trim()) invite.mutate() }}
        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="sr-only" htmlFor="invite-name">Име</label>
        <input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Име"
          className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm" />
        <label className="sr-only" htmlFor="invite-email">Имейл</label>
        <input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Имейл"
          className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm" />
        <button type="submit" disabled={invite.isPending || !email.trim() || !name.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Покани
        </button>
      </form>
    </section>
  )
}
