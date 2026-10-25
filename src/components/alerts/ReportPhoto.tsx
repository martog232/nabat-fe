import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ImageOff, X } from 'lucide-react'
import { usePhoto } from '../../hooks/usePhoto'

/**
 * The reporter's photo, as a thumbnail in the report's card; pressed, it fills the screen.
 * Renders nothing when the report has none.
 */
export function ReportPhoto({ photoUrl, title }: { photoUrl?: string | null; title: string }) {
  const { hasPhoto, src, isError } = usePhoto(photoUrl)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!hasPhoto) return null

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-slate-500">
        <ImageOff className="h-4 w-4" aria-hidden /> Снимката не може да се зареди
      </div>
    )
  }

  // Reserves the thumbnail's height while loading, so the card does not jump when it arrives.
  if (!src) {
    return <div className="h-40 rounded-xl bg-surface-elevated animate-pulse" aria-label="Зареждане на снимката" />
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Отвори снимката"
        className="block w-full overflow-hidden rounded-xl border border-surface-border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <img src={src} alt={`Снимка към „${title}“`} className="h-40 w-full object-cover" />
      </button>

      {/* On document.body, out of the card: the card slides in with a transform, and under a
          transformed ancestor a fixed element is placed and clipped by that ancestor, not
          the screen. */}
      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Снимка към „${title}“`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Затвори снимката"
            autoFocus
            className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <img
            src={src}
            alt={`Снимка към „${title}“`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        </div>,
        document.body,
      )}
    </>
  )
}
