/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useThemeStore } from './store/themeStore'

function ThemeInitializer() {
  const initializeTheme = useThemeStore((s) => s.initializeTheme)

  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])

  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeInitializer />
    <App />
  </StrictMode>,
)
