import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAlertStore } from '../../store/alertStore'
import { useThemeStore } from '../../store/themeStore'
import { AlertMarker } from './AlertMarker'

function MapEventHandler() {
  const { setMapCenter, setMapZoom } = useAlertStore()
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter()
      setMapCenter([c.lat, c.lng])
    },
    zoomend: (e) => {
      setMapZoom(e.target.getZoom())
    },
  })
  return null
}

export function AlertMap() {
  const { mapCenter, mapZoom, alerts } = useAlertStore()
  const theme = useThemeStore((s) => s.theme)
  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  return (
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
      {alerts.map((alert) => (
        <AlertMarker key={alert.id} alert={alert} />
      ))}
    </MapContainer>
  )
}
