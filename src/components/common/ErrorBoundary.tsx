import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/15 flex items-center justify-center">
              <span className="text-3xl">⚡</span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Something went wrong
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              The application encountered an unexpected error.
              Please try reloading the page.
            </p>

            {this.state.error.message && (
              <pre className="text-xs text-left text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-h-24 overflow-auto break-all">
                {this.state.error.message}
              </pre>
            )}

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20 transition-all"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
