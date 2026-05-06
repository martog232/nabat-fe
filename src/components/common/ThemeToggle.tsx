import { Button } from './Button'
import { useThemeStore } from '../../store/themeStore'

interface Props {
  className?: string
}

export function ThemeToggle({ className }: Props) {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={className}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span aria-hidden>{isDark ? '🌙' : '☀️'}</span>
    </Button>
  )
}

