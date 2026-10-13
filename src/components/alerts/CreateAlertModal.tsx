import { useState, useRef, useEffect, useCallback } from 'react'
import { useAlertStore } from '../../store/alertStore'
import { useCreateAlert } from '../../hooks/useAlerts'
import { uploadsApi } from '../../api/uploads'
import type { CreateAlertRequest } from '../../types'
import { errorCodeOf } from '../../api/errors'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { LocationPicker } from '../common/LocationPicker'
import { CategoryPicker } from './CategoryPicker'

interface Props {
  onClose: () => void
  prefillLat?: number
  prefillLng?: number
}

/** The form before a category is chosen: there is no default, a guess would be filed as fact. */
type AlertForm = Omit<CreateAlertRequest, 'categoryCode'> & { categoryCode: number | null }

const MAX_PHOTO_SIZE_MB = 10
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024

/** Must stay in step with ImageContentType on the server. */
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function CreateAlertModal({ onClose, prefillLat, prefillLng }: Props) {
  const { mapCenter } = useAlertStore()
  const mutation = useCreateAlert()

  const [form, setForm] = useState<AlertForm>({
    title: '',
    description: '',
    categoryCode: null,
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
      setPhotoError('Снимката трябва да е JPEG, PNG, GIF или WebP')
      return
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError(`Файлът е твърде голям — до ${MAX_PHOTO_SIZE_MB} MB`)
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
    if (form.title.length > 200) e.title = 'До 200 знака'
    else if (!form.title.trim()) e.title = 'Заглавието е задължително'
    if (form.description.length > 2000) e.description = 'До 2000 знака'
    else if (!form.description.trim()) e.description = 'Описанието е задължително'
    if (form.categoryCode == null) e.categoryCode = 'Изберете категория'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || form.categoryCode == null) return
    const categoryCode = form.categoryCode

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

      await mutation.mutateAsync({ ...form, categoryCode, photoUrl })
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
            <h2 id="modal-title" className="text-base font-bold text-slate-900">
              Подай сигнал
            </h2>
            <button
                type="button"
                onClick={onClose}
                aria-label="Затвори"
                className="-mr-2 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-surface-elevated transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          {/* Form Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4">
            <Input
                label="Заглавие"
                placeholder="Кратко описание на проблема"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                error={errors.title}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Описание
              </label>
              <textarea
                  rows={3}
                  placeholder="Опишете проблема по-подробно…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={`
                w-full px-3 py-2.5 rounded-lg text-sm resize-none
                bg-surface-elevated border text-slate-900 placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                ${errors.description ? 'border-red-500/60' : 'border-surface-border'}
              `}
              />
              {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
            </div>

            <CategoryPicker
                value={form.categoryCode}
                onChange={(code) => {
                  setForm((f) => ({ ...f, categoryCode: code }))
                  setErrors((e) => ({ ...e, categoryCode: undefined }))
                }}
                error={errors.categoryCode}
            />

            {/* Location Picker integration */}
            <LocationPicker
                value={{ latitude: form.latitude, longitude: form.longitude }}
                onChange={handleLocationChange}
            />

            {/* Photo upload */}
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide block mb-2">
                Снимка (по желание)
              </label>
              <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    className="px-4 min-h-[2.75rem] rounded-lg border border-surface-border bg-surface-elevated text-sm text-slate-600 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {photoFile ? 'Смени снимката' : 'Избери снимка'}
                </button>
                {photoFile && (
                  <button
                      type="button"
                      onClick={clearPhoto}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Премахни
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
                        alt="Преглед на снимката"
                        className="w-24 h-24 object-cover rounded-lg border border-surface-border"
                    />
                  </div>
              )}
            </div>

            {mutation.isError && (
                <p role="alert" className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">
                  {/* The one refusal worth its own words: the report is fine, the place is
                      not somewhere nabat has a district to send it to, and "try again"
                      would send the user round the same loop. */}
                  {errorCodeOf(mutation.error) === 'OUTSIDE_SERVICE_AREA'
                    ? 'Nabat покрива само София. Преместете маркера на място в града.'
                    : 'Сигналът не можа да бъде изпратен. Опитайте отново.'}
                </p>
            )}
          </div>

          {/* Footer controls */}
          <div className="flex flex-shrink-0 gap-3 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-surface-border">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Отказ
            </Button>
            <Button type="submit" className="flex-1" isLoading={mutation.isPending || photoUploading}>
              {photoUploading ? 'Качване на снимката…' : 'Изпрати сигнала'}
            </Button>
          </div>
        </form>
      </div>
  )
}
