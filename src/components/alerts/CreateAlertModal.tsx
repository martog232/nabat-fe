import { useState, useRef, useEffect, useCallback } from 'react'
import { useAlertStore } from '../../store/alertStore'
import { useCreateAlert } from '../../hooks/useAlerts'
import { uploadsApi } from '../../api/uploads'
import type { AlertType, AlertSeverity, CreateAlertRequest } from '../../types'
import { ALERT_TYPE_LABELS, ALERT_TYPE_ICONS } from '../../types'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { LocationPicker } from '../common/LocationPicker'

interface Props {
  onClose: () => void
  prefillLat?: number
  prefillLng?: number
}

const ALERT_TYPES = Object.keys(ALERT_TYPE_LABELS) as AlertType[]
const SEVERITIES: AlertSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  LOW: 'border-green-500/50 bg-green-500/10 text-green-400',
  MEDIUM: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
  HIGH: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  CRITICAL: 'border-red-500/50 bg-red-500/10 text-red-400',
}

const MAX_PHOTO_SIZE_MB = 10
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024

/** Must stay in step with ImageContentType on the server. */
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function CreateAlertModal({ onClose, prefillLat, prefillLng }: Props) {
  const { mapCenter } = useAlertStore()
  const mutation = useCreateAlert()

  const [form, setForm] = useState<CreateAlertRequest>({
    title: '',
    description: '',
    type: 'OTHER',
    severity: 'MEDIUM',
    latitude: prefillLat ?? mapCenter[0],
    longitude: prefillLng ?? mapCenter[1],
  })

  const [errors, setErrors] = useState<Partial<Record<keyof CreateAlertRequest, string>>>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  /** URL of an already-uploaded photo, so a retry does not upload it twice. */
  const uploadedPhotoUrl = useRef<string | null>(null)

  // Memoize location handler to prevent unnecessary re-renders of the picker
  const handleLocationChange = useCallback((loc: { latitude: number; longitude: number }) => {
    setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude }))
  }, [])

  // Safely close modal on background click without text selection triggers
  useEffect(() => {
    const handleOverlayClick = (e: MouseEvent) => {
      if (e.target === overlayRef.current) onClose()
    }
    document.addEventListener('click', handleOverlayClick)
    return () => document.removeEventListener('click', handleOverlayClick)
  }, [onClose])

  // Close modal on Escape press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setPhotoError(null)
    if (!file) {
      setPhotoFile(null)
      setPhotoPreview(null)
      return
    }
    // Matches the server's allow-list (JPEG/PNG/GIF/WebP, verified there by magic
    // bytes). SVG is excluded on both sides: it is XML that can carry script.
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setPhotoError('Photos must be JPEG, PNG, GIF or WebP')
      return
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError(`File too large — max ${MAX_PHOTO_SIZE_MB} MB`)
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const clearPhoto = () => {
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setPhotoError(null)
    uploadedPhotoUrl.current = null
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validate = (): boolean => {
    const e: typeof errors = {}
    // Length checked before emptiness so the more specific message wins; the previous
    // order let the length error overwrite "is required" for a blank-but-long value.
    if (form.title.length > 200) e.title = 'Max 200 characters'
    else if (!form.title.trim()) e.title = 'Title is required'
    if (form.description.length > 2000) e.description = 'Max 2000 characters'
    else if (!form.description.trim()) e.description = 'Description is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    // Uploading before creating the alert means a failed create leaves the photo
    // orphaned on the server's volume with nothing referencing it. Retaining the URL
    // lets a retry reuse it instead of uploading a second copy.
    let photoUrl: string | undefined = uploadedPhotoUrl.current ?? undefined

    try {
      if (photoFile && !photoUrl) {
        setPhotoUploading(true)
        const result = await uploadsApi.upload(photoFile)
        photoUrl = result.url
        uploadedPhotoUrl.current = result.url
        setPhotoUploading(false)
      }

      await mutation.mutateAsync({ ...form, photoUrl })
      // Committed — the alert now references it, so drop our claim on it.
      uploadedPhotoUrl.current = null
      onClose()
    } catch {
      setPhotoUploading(false)
      // Error surfaced via mutation.isError / photoError below.
    }
  }

  return (
      <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:px-4 animate-fade-in"
      >
        <form
            onSubmit={handleSubmit}
            className="flex flex-col w-full max-h-[92dvh] sm:max-h-[85dvh] sm:max-w-lg bg-surface-card border border-surface-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 id="modal-title" className="text-base font-bold text-slate-900 dark:text-white">
              Report Incident
            </h2>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="-mr-2 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-surface-elevated transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          {/* Form Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4">
            <Input
                label="Title"
                placeholder="Brief incident description"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                error={errors.title}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Description
              </label>
              <textarea
                  rows={3}
                  placeholder="Provide more details about the incident…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={`
                w-full px-3 py-2.5 rounded-lg text-sm resize-none
                bg-surface-elevated border text-slate-900 dark:text-slate-200 placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                ${errors.description ? 'border-red-500/60' : 'border-surface-border'}
              `}
              />
              {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
            </div>

            {/* Alert type grid */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                Incident Type
              </label>
              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 gap-2">
                {ALERT_TYPES.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t }))}
                        className={`
                    flex flex-col items-center justify-center min-h-[3.25rem] py-2 px-1 rounded-xl border text-xs transition-all cursor-pointer
                    ${form.type === t ? 'border-brand-500/60 bg-brand-500/15 text-brand-300' : 'border-surface-border bg-surface-elevated text-slate-600 dark:text-slate-400 hover:border-surface-elevated hover:text-slate-800 dark:hover:text-slate-200'}
                  `}
                    >
                      <span className="text-lg" aria-hidden="true">{ALERT_TYPE_ICONS[t]}</span>
                      <span className="mt-0.5 text-center leading-tight" style={{ fontSize: '0.65rem' }}>
                    {ALERT_TYPE_LABELS[t].split(' ')[0]}
                  </span>
                    </button>
                ))}
              </div>
            </div>

            {/* Severity selector */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                Severity
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SEVERITIES.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, severity: s }))}
                        className={`
                    min-h-[2.75rem] py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer
                    ${form.severity === s ? SEVERITY_STYLES[s] : 'border-surface-border bg-surface-elevated text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
                  `}
                    >
                      {s}
                    </button>
                ))}
              </div>
            </div>

            {/* Location Picker integration */}
            <LocationPicker
                value={{ latitude: form.latitude, longitude: form.longitude }}
                onChange={handleLocationChange}
            />

            {/* Photo upload */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                Photo (optional)
              </label>
              <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    className="px-4 min-h-[2.75rem] rounded-lg border border-surface-border bg-surface-elevated text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {photoFile ? 'Change photo' : 'Choose photo'}
                </button>
                {photoFile && (
                  <button
                      type="button"
                      onClick={clearPhoto}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(',')}
                    onChange={handlePhotoSelect}
                    className="hidden"
                />
              </div>
              {photoError && (
                  <p className="text-xs text-red-400 mt-1">{photoError}</p>
              )}
              {photoPreview && (
                  <div className="mt-2 relative inline-block">
                    <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg border border-surface-border"
                    />
                  </div>
              )}
            </div>

            {mutation.isError && (
                <p role="alert" className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">
                  Failed to create alert. Please try again.
                </p>
            )}
          </div>

          {/* Footer controls */}
          <div className="flex flex-shrink-0 gap-3 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-surface-border">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={mutation.isPending || photoUploading}>
              {photoUploading ? 'Uploading photo…' : '🚨 Report Incident'}
            </Button>
          </div>
        </form>
      </div>
  )
}
