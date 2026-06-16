import { useEffect, useRef } from 'react'
import { useAlertStore } from '../../store/alertStore'
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../../hooks/useNotifications'
import type { Notification, NotificationType } from '../../types'

interface NotificationPanelProps {
  onClose: () => void
}

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  ALERT_UPVOTED: '👍',
  ALERT_DOWNVOTED: '👎',
  ALERT_CONFIRMED: '✅',
  ALERT_MILESTONE: '🏆',
  ALERT_RESOLVED: '🔒',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function NotificationItem({ notification }: { notification: Notification }) {
  const selectAlert = useAlertStore((s) => s.selectAlert)
  const markAsRead = useMarkAsRead()

  const handleClick = () => {
    if (!notification.read) {
      markAsRead.mutate(notification.id)
    }
    if (notification.relatedAlertId) {
      selectAlert(notification.relatedAlertId)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-full text-left px-4 py-3 flex items-start gap-3 transition-colors duration-150
        ${notification.read ? 'bg-surface-card' : 'bg-surface-elevated/30'}
        hover:bg-surface-elevated/50
      `}
    >
      <div className="text-lg flex-shrink-0 mt-0.5">
        {NOTIFICATION_ICONS[notification.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm font-medium truncate ${
              notification.read
                ? 'text-slate-600 dark:text-slate-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {notification.title}
          </span>
          <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
            {timeAgo(notification.createdAt)}
          </span>
        </div>
        {notification.message && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
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
      className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden z-[1001]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs text-brand-400 font-normal">
              ({unreadCount} unread)
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <span className="text-3xl mb-2">🔔</span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No notifications yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Vote on alerts to receive updates.
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
