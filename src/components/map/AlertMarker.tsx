import { divIcon } from 'leaflet'
import { Marker } from 'react-leaflet'
import type { Alert } from '../../types'
import { ALERT_TYPE_ICONS, SEVERITY_MARKER_COLORS } from '../../types'
import { useAlertStore } from '../../store/alertStore'

interface AlertMarkerProps {
  alert: Alert
}

function createAlertIcon(alert: Alert) {
  const color = SEVERITY_MARKER_COLORS[alert.severity]
  const emoji = ALERT_TYPE_ICONS[alert.type]
  return divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    html: `
      <div style="
        width:40px; height:40px;
        background:${color}22;
        border:2px solid ${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
        box-shadow: 0 4px 12px ${color}44;
        animation: pulse-ring 2s ease-in-out infinite;
      ">
        <div style="transform:rotate(45deg); font-size:16px; line-height:1;">${emoji}</div>
      </div>
      <style>
        @keyframes pulse-ring {
          0%,100%{box-shadow:0 4px 12px ${color}44}
          50%{box-shadow:0 4px 20px ${color}88}
        }
      </style>
    `,
  })
}

export function AlertMarker({ alert }: AlertMarkerProps) {
  const selectAlert = useAlertStore((s) => s.selectAlert)

  return (
    <Marker
      position={[alert.latitude, alert.longitude]}
      icon={createAlertIcon(alert)}
      eventHandlers={{ click: () => selectAlert(alert) }}
    />
  )
}
