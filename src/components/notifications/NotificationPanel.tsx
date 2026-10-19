import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAlertStore } from '../../store/alertStore'
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../../hooks/useNotifications'
import type { Notification, NotificationType } from '../../types'
import { BadgeCheck, Bell, Forward, Lock, MessageCircle, ThumbsDown, ThumbsUp, Trophy, type LucideIcon } from 'lucide-react'

interface NotificationPanelProps {
  onClose: () => void
}

const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  ALERT_UPVOTED: ThumbsUp,
  ALERT_DOWNVOTED: ThumbsDown,
  ALERT_CONFIRMED: BadgeCheck,
  ALERT_MILESTONE: Trophy,
  ALERT_RESOLVED: Lock,
  COMMENT_ADDED: MessageCircle,
  REPORT_FORWARDED: Forward,
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Току-що'
  if (mins < 60) return `преди ${mins} мин`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `преди ${hrs} ч`
  const days = Math.floor(hrs / 24)
  return `преди ${days} ${days === 1 ? 'ден' : 'дни'}`
}

function NotificationItem({ notification }: { notification: Notification }) {
  const selectAlert = useAlertStore((s) => s.selectAlert)
  const markAsRead = useMarkAsRead()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleClick = () => {
    if (!notification.read) {
      markAsRead.mutate(notification.id)
    }
    if (notification.relatedAlertId) {
      selectAlert(notification.relatedAlertId)
      // The report's detail is mounted on the map page only. From anywhere else, selecting
      // it changed nothing visible — and "is it really fixed?" is asked from this click.
      if (pathname !== '/map') {
        navigate('/map')
      }
    }
  }

  const TypeIcon = NOTIFICATION_ICONS[notification.type] ?? Bell

  return (
    <button
      onClick={handleClick}
      className={`
        w-full text-left px-4 py-3 flex items-start gap-3 transition-colors duration-150
        ${notification.read ? 'bg-surface-card' : 'bg-surface-elevated/30'}
        hover:bg-surface-elevated/50
      `}
    >
      <div className="flex-shrink-0 mt-0.5 text-slate-500">
        <TypeIcon className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm font-medium truncate ${
              notification.read
                ? 'text-slate-600'
                : 'text-slate-900'
            }`}
          >
            {notification.title}
          </span>
          <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
            {timeAgo(notification.createdAt)}
          </span>
        </div>
        {notification.message && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
      </div>
    </button>
  )
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { data: notifications, isLoading } = useNotifications()
  const markAllAsRead = useMarkAllAsRead()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0

  return (
    <div
      ref={panelRef}
      className="fixed inset-x-2 top-[calc(3.5rem+env(safe-area-inset-top))] sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80 md:w-96 flex flex-col max-h-[70dvh] bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden z-[1001]"
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 border-b border-surface-border">
        <h3 className="font-semibold text-sm text-slate-900">
          Известия
          {unreadCount > 0 && (
            <span className="ml-2 text-xs text-brand-400 font-normal">
              ({unreadCount} непрочетени)
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
          >
            Маркирай всички като прочетени
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain sm:max-h-96">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Bell className="mb-2 h-8 w-8 text-slate-400" aria-hidden />
            <p className="text-sm text-slate-500">
              Все още нямате известия
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Гласувайте за сигнали, за да получавате новини за тях.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))
        )}
      </div>
    </div>
  )
}
