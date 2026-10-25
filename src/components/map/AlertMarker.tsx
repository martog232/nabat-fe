import { memo, useMemo } from 'react'
import { Marker } from 'react-leaflet'
import type { Alert } from '../../types'
import { useAlertStore } from '../../store/alertStore'
import { createAlertIcon } from './alertIcon'
import { useResolvedCategory } from '../../hooks/useCategories'

interface AlertMarkerProps {
  alert: Alert
}

function AlertMarkerInner({ alert }: AlertMarkerProps) {
  const selectAlert = useAlertStore((s) => s.selectAlert)
  const isSelected = useAlertStore((s) => s.selectedAlertId === alert.id)
  const groupCode = useResolvedCategory(alert.categoryCode)?.group.code
  const icon = useMemo(() => createAlertIcon(alert, isSelected, groupCode), [alert, isSelected, groupCode])

  return (
    <Marker
      position={[alert.latitude, alert.longitude]}
      icon={icon}
      // Without this the halo is drawn under whichever pins happen to sort after it:
      // Leaflet orders markers by latitude, not by what the user just clicked on.
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{ click: () => selectAlert(alert.id) }}
    />
  )
}

export const AlertMarker = memo(AlertMarkerInner)
