import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useUnreadCount } from '../../hooks/useNotifications'
import { NotificationPanel } from '../notifications/NotificationPanel'

export function Navbar() {
  const [showNotifications, setShowNotifications] = useState(false)
  const { data: unreadCount } = useUnreadCount()
  const user = useAuthStore((s) => s.user)

  const count = unreadCount?.count ?? 0

  const toggleNotifications = useCallback(() => {
    setShowNotifications((prev) => !prev)
  }, [])

  const closeNotifications = useCallback(() => {
    setShowNotifications(false)
  }, [])

  return (
    <nav className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:pt-3">
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2 rounded-full bg-surface-card/80 backdrop-blur border border-surface-border px-2.5 py-1.5 sm:border-transparent sm:bg-transparent sm:backdrop-blur-none sm:px-0 sm:py-0"
      >
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/40">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        </div>
        <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">Nabat</span>
      </Link>

      {/* Right section */}
      {user && (
        <div className="relative flex items-center gap-2">
          {/* Notification bell */}
          <button
            onClick={toggleNotifications}
            className="relative flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-surface-card/80 backdrop-blur border border-surface-border sm:border-transparent sm:bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-surface-elevated transition-colors"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4.5 h-4.5 text-[10px] font-bold text-white bg-red-500 rounded-full min-w-[18px] min-h-[18px] leading-none">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifications && <NotificationPanel onClose={closeNotifications} />}
        </div>
      )}
    </nav>
  )
}
