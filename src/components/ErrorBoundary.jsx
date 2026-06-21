import { Component } from 'react'

// Catches render-time crashes so a bug shows a readable message instead of a
// blank white screen. Uses inline styles so it renders even if CSS failed.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      const err = this.state.error
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>📺 Something went wrong</h1>
          <p style={{ color: '#475569', marginTop: 8 }}>
            The page hit an error. Please share this text so it can be fixed:
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
              fontSize: 13,
            }}
          >
            {String(err && (err.stack || err.message || err))}
          </pre>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('kids-video-portal:v1')
              } catch {
                /* ignore */
              }
              location.reload()
            }}
            style={{
              marginTop: 16,
              padding: '10px 18px',
              borderRadius: 12,
              border: 0,
              background: '#8b5cf6',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Clear saved data &amp; reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
