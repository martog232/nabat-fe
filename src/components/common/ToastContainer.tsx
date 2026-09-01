import { useEffect, useRef, useState } from 'react'
import { useToastStore, type Toast } from '../../store/toastStore'

const ICONS: Record<string, string> = {
  error:   '✕',
  success: '✓',
  info:    'ℹ',
}

const COLOR: Record<string, { bar: string; bg: string; text: string; icon: string }> = {
  error: {
    bar:  'bg-red-500',
    bg:   'bg-surface-card border-red-500/30',
    text: 'text-slate-900 dark:text-slate-100',
    icon: 'text-red-400 bg-red-500/15',
  },
  success: {
    bar:  'bg-green-500',
    bg:   'bg-surface-card border-green-500/30',
    text: 'text-slate-900 dark:text-slate-100',
    icon: 'text-green-400 bg-green-500/15',
  },
  info: {
    bar:  'bg-brand-500',
    bg:   'bg-surface-card border-brand-500/30',
    text: 'text-slate-900 dark:text-slate-100',
    icon: 'text-brand-400 bg-brand-500/15',
  },
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const duration = toast.duration ?? 4_000

  // Trigger enter animation on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    if (leaving) return
    setLeaving(true)
    leaveTimer.current = setTimeout(() => removeToast(toast.id), 300)
  }

  // Kick off leave animation just before the store removes the toast
  useEffect(() => {
    const t = setTimeout(dismiss, duration - 300)
    return () => {
      clearTimeout(t)
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const c = COLOR[toast.type] ?? COLOR.info

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={dismiss}
      className={`
        relative flex items-start gap-3 w-80 max-w-[90vw] px-4 py-3 rounded-xl border shadow-xl
        cursor-pointer select-none overflow-hidden
        transition-all duration-300
        ${c.bg} ${c.text}
        ${visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}
      `}
    >
      {/* Left colour bar */}
      <span className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${c.bar}`} />

      {/* Icon */}
      <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${c.icon}`}>
        {ICONS[toast.type]}
      </span>

      {/* Message */}
      <p className="text-sm leading-snug flex-1 pr-4">{toast.message}</p>

      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss() }}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-xs"
      >
        ✕
      </button>

      {/* Progress bar */}
      <span
        className={`absolute bottom-0 left-0 h-0.5 ${c.bar} opacity-40`}
        style={{
          animation: `toast-progress ${duration}ms linear forwards`,
          width: '100%',
        }}
      />
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <>
      {/* Inline keyframe — avoids adding a Tailwind plugin */}
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); transform-origin: left; }
          to   { transform: scaleX(0); transform-origin: left; }
        }
      `}</style>

      {/*
        Below the navbar, not on top of it. Toasts sit at z-[9999] and the navbar at z-[1000],
        so at `top-4` they covered the notification bell and the account avatar — the two
        controls in the corner they land in, and the bell is where someone goes to read the
        notification the toast is about.

        The offset clears the navbar's tallest state: 44px controls plus its padding, plus the
        safe-area inset on a notched phone.
      */}
      <div
        aria-label="Notifications"
        className="fixed right-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </div>
    </>
  )
}




