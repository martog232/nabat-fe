import { Button } from './Button'
import { useThemeStore } from '../../store/themeStore'

interface Props {
  className?: string
}

/**
 * Icons rather than the emoji this used to render.
 *
 * <p>An emoji is drawn by the operating system's font, so the control looked different on
 * every platform and matched nothing else in the interface — the only glyph in the app not
 * from its own icon set. These inherit `currentColor` and scale with the button.
 */
export function ThemeToggle({ className }: Props) {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={className}
      title={label}
      aria-label={label}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"
            strokeLinecap="round"
          />
        </svg>
      )}
    </Button>
  )
}
