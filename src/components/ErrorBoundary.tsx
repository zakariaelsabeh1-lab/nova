import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

// Catches render/runtime crashes so the app shows the actual error instead of a
// blank white page. Also offers a hard reset (clears persisted auth/workspace
// state) for the "loads once then won't load again" case, which is almost always
// a corrupt persisted session or a stuck auth lock.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('Nova crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'linear-gradient(135deg, #060c18 0%, #0f172a 60%, #1e1b4b 100%)',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            borderRadius: 24,
            padding: 28,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Something on this page crashed</h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Here's the exact error (copy this to me if it persists):
          </p>
          <pre
            style={{
              fontSize: 12,
              color: '#fca5a5',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 12,
              padding: 12,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              margin: '0 0 16px',
            }}
          >
            {this.state.error.message}
          </pre>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              }}
            >
              Reload
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear()
                  sessionStorage.clear()
                } catch {
                  /* ignore */
                }
                window.location.href = '/login'
              }}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              Reset &amp; sign in again
            </button>
          </div>
        </div>
      </div>
    )
  }
}
