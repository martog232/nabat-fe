import { useEffect, useState } from 'react'

/**
 * Subscribes to a CSS media query from JavaScript.
 *
 * Layout differences belong in Tailwind breakpoints, not here — a class is free and cannot
 * fall out of step with the stylesheet. This is for the cases where the *behaviour* differs,
 * not the styling: the alert list starts collapsed on a phone and open on a desktop, and
 * opening an alert closes the list on a phone because both cannot share the screen. A CSS
 * class cannot express either.
 *
 * Initialised from `matchMedia` rather than from a default, so the first render is already
 * correct: seeding it `false` would mount the desktop layout and visibly snap to the mobile
 * one immediately after.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const list = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)

    // Re-read on subscribe: the query may have changed between the initial render and here
    // (an orientation change during hydration is enough).
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind's `md` breakpoint. Keep in step with tailwind.config.js if that is ever changed. */
export const DESKTOP_QUERY = '(min-width: 768px)'

/** True on tablet-and-wider, where the alert list is a side panel rather than a sheet. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY)
}
