import { Link } from 'react-router-dom'

export function Navbar() {
  return (
    <nav className="absolute top-0 left-0 right-0 z-[1000] flex items-center px-4 py-3">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/40">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        </div>
        <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">Nabat</span>
      </Link>
    </nav>
  )
}
