import { divIcon } from 'leaflet'
import type { Alert } from '../../types'
import { groupIcon, STATUS_MARKER_COLORS } from '../../types'

/**
 * @param groupCode the category group of the alert, for its icon; undefined while the
 *                  catalogue loads, which draws the fallback pin until it has.
 */
export function createAlertIcon(alert: Alert, isSelected: boolean, groupCode?: number) {
  const color = STATUS_MARKER_COLORS[alert.status]
  const emoji = groupIcon(groupCode)
  // The selected pin gets a disc behind it rather than a bigger pin: growing the marker
  // would move its tip off the coordinate it is reporting. The disc is centred on the
  // round part of the teardrop (20,20 within the 40x40 box) and overflows it, which a
  // divIcon allows — nothing clips it once the default leaflet-div-icon class is off.
  // Its keyframes ride along inside this branch: every marker inlines its own <style>,
  // so a rule left at the top level would be duplicated across pins that never use it.
  const selectionHalo = isSelected
    ? `
      <span style="
        position:absolute; left:-10px; top:-10px;
        width:60px; height:60px; border-radius:9999px;
        background:${color}33;
        border:2px solid ${color};
        box-shadow:0 0 0 4px ${color}22, 0 6px 16px ${color}55;
        animation: alert-halo-pulse 1.8s ease-in-out infinite;
      "></span>
      <style>
        @keyframes alert-halo-pulse {
          0%,100%{transform:scale(1); opacity:1}
          50%{transform:scale(1.08); opacity:.85}
        }
      </style>
    `
    : ''
  return divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    html: `
      <div style="position:relative; width:40px; height:40px;">
        ${selectionHalo}
        <div style="
          position:absolute; inset:0;
          background:${isSelected ? `${color}66` : `${color}22`};
          border:${isSelected ? '3px' : '2px'} solid ${color};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow: 0 4px 12px ${color}44;
          animation: pulse-ring 2s ease-in-out infinite;
        ">
          <div style="transform:rotate(45deg); font-size:16px; line-height:1;">${emoji}</div>
        </div>
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
