import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { divIcon, type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useThemeStore } from '../../store/themeStore'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export interface PickedLocation {
  latitude: number
  longitude: number
  address?: string
}

interface Props {
  value: PickedLocation
  onChange: (loc: PickedLocation) => void
}

const PIN_ICON = divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  html: `
    <div style="
      width:32px;height:32px;
      background:#3b82f6;
      border:2px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 4px 14px rgba(0,0,0,.45);
      display:flex;align-items:center;justify-content:center;
    ">
      <div style="
        width:8px;height:8px;background:#fff;border-radius:50%;
        transform:rotate(45deg);
      "></div>
    </div>
  `,
})

// ─── Helpers ────────────────────────────────────────────────────────────────
const NOMINATIM = 'https://nominatim.openstreetmap.org'

async function searchAddress(q: string, signal: AbortSignal): Promise<NominatimResult[]> {
  const url = `${NOMINATIM}/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!r.ok) return []
  return r.json()
}

async function reverseGeocode(lat: number, lon: number, signal: AbortSignal): Promise<string | undefined> {
  const url = `${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lon}`
  const r = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!r.ok) return undefined
  const j = await r.json()
  return j?.display_name as string | undefined
}

// Move the map view when the lat/lng changes externally
function FlyTo({ center }: { center: LatLngExpression }) {
  const map = useMap()
  useEffect(() => { map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 0.6 }) }, [center, map])
  return null
}

// Capture map clicks → set marker
function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

// ─── Component ──────────────────────────────────────────────────────────────
export function LocationPicker({ value, onChange }: Props) {
  const theme = useThemeStore((s) => s.theme)
  const [mode, setMode] = useState<'address' | 'map'>('address')
  const [query, setQuery] = useState(value.address ?? '')
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (mode !== 'address') return
    const q = query.trim()
    if (q.length < 3) { setSuggestions([]); return }
    const ctl = new AbortController()
    setIsSearching(true)
    const id = setTimeout(async () => {
      try {
        const res = await searchAddress(q, ctl.signal)
        setSuggestions(res)
        setOpen(true)
      } catch { /* ignore */ }
      finally { setIsSearching(false) }
    }, 350)
    return () => { clearTimeout(id); ctl.abort() }
  }, [query, mode])

  // Close suggestions on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const pickSuggestion = (s: NominatimResult) => {
    const lat = parseFloat(s.lat)
    const lon = parseFloat(s.lon)
    onChange({ latitude: lat, longitude: lon, address: s.display_name })
    setQuery(s.display_name)
    setOpen(false)
  }

  const handleMapPick = async (lat: number, lng: number) => {
    onChange({ latitude: lat, longitude: lng, address: value.address })
    const ctl = new AbortController()
    try {
      const addr = await reverseGeocode(lat, lng, ctl.signal)
      onChange({ latitude: lat, longitude: lng, address: addr })
      if (addr) setQuery(addr)
    } catch { /* ignore */ }
  }

  const center = useMemo<LatLngExpression>(() => [value.latitude, value.longitude], [value.latitude, value.longitude])
  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Location</label>
        <div className="inline-flex rounded-lg border border-surface-border bg-surface-elevated p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('address')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${mode === 'address' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            🔎 Address
          </button>
          <button
            type="button"
            onClick={() => setMode('map')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${mode === 'map' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            📍 Map
          </button>
        </div>
      </div>

      {mode === 'address' ? (
        <div ref={wrapperRef} className="relative">
          <input
            type="text"
            value={query}
            placeholder="Street and number, city…"
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-elevated border border-surface-border text-slate-900 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">…</span>
          )}
          {open && suggestions.length > 0 && (
            <ul className="absolute z-[2100] mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-surface-border bg-surface-card shadow-xl">
              {suggestions.map((s) => (
                <li key={s.place_id}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-surface-elevated transition-colors cursor-pointer"
                  >
                    {s.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && !isSearching && suggestions.length === 0 && query.trim().length >= 3 && (
            <div className="absolute z-[2100] mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-slate-500">
              No matches found
            </div>
          )}
        </div>
      ) : (
        <div className="h-56 w-full overflow-hidden rounded-lg border border-surface-border">
          <MapContainer center={center} zoom={15} className="w-full h-full" zoomControl>
            <TileLayer
              url={tileUrl}
              attribution="© OpenStreetMap contributors © CARTO"
            />
            <FlyTo center={center} />
            <ClickCapture onPick={handleMapPick} />
            <Marker
              position={center}
              icon={PIN_ICON}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng()
                  handleMapPick(ll.lat, ll.lng)
                },
              }}
            />
          </MapContainer>
        </div>
      )}

      <p className="text-[11px] text-slate-600 dark:text-slate-500">
        {value.address ? <span className="line-clamp-1">📌 {value.address}</span> : 'Pick a location to see its address.'}
        <span className="ml-2 text-slate-700 dark:text-slate-600">
          ({value.latitude.toFixed(5)}, {value.longitude.toFixed(5)})
        </span>
      </p>
    </div>
  )
}

