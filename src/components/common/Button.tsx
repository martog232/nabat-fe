import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

const variants = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20',
  secondary: 'bg-surface-elevated hover:bg-surface-border text-slate-700 dark:text-slate-200 border border-surface-border',
  ghost: 'hover:bg-surface-elevated text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
  danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  // Icon-only: no padding of its own, so the caller sets the box with width and height.
  // Needed because `sizes` is applied before `className` in the class list but CSS order,
  // not attribute order, decides the winner — a caller passing `w-14 h-14` could not undo
  // `px-6` and the glyph ended up squeezed out of a square button.
  icon: 'p-0 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, children, className = '', disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
        focus-visible:ring-offset-2 focus-visible:ring-offset-surface
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...rest}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
