import { useEffect, useMemo } from 'react'
import { divIcon } from 'leaflet'
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAlertStore } from '../../store/alertStore'
import { useThemeStore } from '../../store/themeStore'
import { AlertMarker } from './AlertMarker'
import { RadiusSelector } from './RadiusSelector'

function MapEventHandler() {
  const { setMapCenter, setMapZoom, setFollowUser } = useAlertStore()
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter()
      setMapCenter([c.lat, c.lng])
    },
    dragstart: () => {
      setFollowUser(false)
    },
    zoomend: (e) => {
      setMapZoom(e.target.getZoom())
    },
  })
  return null
}

function FollowModeController() {
  const map = useMap()
  const userLat = useAlertStore((s) => s.userLat)
  const userLng = useAlertStore((s) => s.userLng)
  const followUser = useAlertStore((s) => s.followUser)

  useEffect(() => {
    if (!followUser || userLat === null || userLng === null) return
    map.setView([userLat, userLng])
  }, [followUser, map, userLat, userLng])

  return null
}

export function AlertMap() {
  const { mapCenter, mapZoom, alerts, userLat, userLng, radiusKm, followUser, setFollowUser } = useAlertStore()
  const theme = useThemeStore((s) => s.theme)
  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const userIcon = useMemo(
    () =>
      divIcon({
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        html: `
          <div style="position:relative;width:18px;height:18px;">
            <span style="position:absolute;inset:0;border-radius:9999px;background:#3b82f6;opacity:.35;animation:user-dot-pulse 2s ease-out infinite;"></span>
            <span style="position:absolute;left:4px;top:4px;width:10px;height:10px;border-radius:9999px;background:#3b82f6;border:2px solid #ffffff;"></span>
          </div>
          <style>
            @keyframes user-dot-pulse {
              0% { transform: scale(1); opacity: .45; }
              100% { transform: scale(2.2); opacity: 0; }
            }
          </style>
        `,
      }),
    [],
  )

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        zoomControl
      >
        <TileLayer
          url={tileUrl}
          attribution="© OpenStreetMap contributors © CARTO"
        />
        <MapEventHandler />
        <FollowModeController />
        {userLat !== null && userLng !== null && (
          <>
            <Circle
              center={[userLat, userLng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: '#3b82f6',
                weight: 2,
                opacity: 0.8,
                fillColor: '#3b82f6',
                fillOpacity: 0.05,
              }}
            />
            <Marker position={[userLat, userLng]} icon={userIcon} />
          </>
        )}
        {alerts.map((alert) => (
          <AlertMarker key={alert.id} alert={alert} />
        ))}
      </MapContainer>
      <div className="absolute top-4 right-4 z-[1000]">
        <RadiusSelector />
      </div>
      <button
        type="button"
        onClick={() => setFollowUser(!followUser)}
        className="absolute bottom-24 right-4 z-[1000] h-10 w-10 rounded-full border border-white/10 bg-surface-card/95 backdrop-blur-sm text-lg text-slate-100 hover:bg-surface-hover transition-colors shadow-lg"
        title={followUser ? 'Disable follow mode' : 'Enable follow mode'}
        aria-label={followUser ? 'Disable follow mode' : 'Enable follow mode'}
      >
        {followUser ? '🎯' : '🗺️'}
      </button>
    </div>
  )
}
