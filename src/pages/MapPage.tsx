import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { AlertMap } from '../components/map/AlertMap'
import { AlertSidebar } from '../components/alerts/AlertSidebar'
import { AlertDetail } from '../components/alerts/AlertDetail'
import { CreateAlertModal } from '../components/alerts/CreateAlertModal'
import { useAlertWebSocket } from '../hooks/useAlertWebSocket'
import { useNearbyAlerts } from '../hooks/useAlerts'
import { useAuthStore } from '../store/authStore'
import { useAlertStore } from '../store/alertStore'
import { Button } from '../components/common/Button'
import { useGeolocation } from '../hooks/useGeolocation'

export function MapPage() {
  const user = useAuthStore((s) => s.user)
  const wsConnected = useAlertStore((s) => s.wsConnected)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Live alerts
  useNearbyAlerts()

  // Real-time WebSocket
  useAlertWebSocket()
  useGeolocation()

  return (
    <Layout>
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <AlertMap />
      </div>

      {/* Left sidebar */}
      <AlertSidebar />

      {/* Alert detail panel */}
      <AlertDetail />

      {/*
        Report button. On a phone it sits above the collapsed alert sheet and left of the map
        controls, and drops the label — three words of text next to two round buttons in a
        44px strip is how a corner becomes unhittable. From sm: the label returns.
      */}
      {user && (
        <div className="absolute z-[1000] left-4 bottom-[calc(var(--sheet-peek)+1rem)] sm:left-auto sm:right-4 sm:bottom-6">
          <Button
            onClick={() => setShowCreateModal(true)}
            aria-label="Report incident"
            className="h-14 w-14 sm:h-auto sm:w-auto sm:px-5 sm:py-3 sm:text-sm justify-center shadow-2xl shadow-brand-600/40 rounded-full sm:rounded-2xl"
            size="icon"
          >
            <span className="text-xl sm:text-lg">🚨</span>
            <span className="hidden sm:inline">Report Incident</span>
          </Button>
        </div>
      )}

      {/*
        Connection state. Bottom-centre is the busiest strip on a phone — sheet handle, report
        button, map controls — so on small screens this moves under the navbar, where nothing
        else competes for space and it is still in view.
      */}
      <div className="absolute z-[1000] top-14 left-1/2 -translate-x-1/2 sm:top-auto sm:bottom-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-card/80 backdrop-blur border border-surface-border text-xs text-slate-600 dark:text-slate-400">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse-fast' : 'bg-amber-500'}`} />
          {wsConnected ? 'Live updates' : 'Polling fallback'}
        </div>
      </div>

      {/* Create alert modal */}
      {showCreateModal && (
        <CreateAlertModal onClose={() => setShowCreateModal(false)} />
      )}
    </Layout>
  )
}
