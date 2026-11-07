import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onReset?: () => void
}
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error) { console.error('Mission Control crashed:', error) }
  reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }
  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset)
      return (
        <div className="boot-screen">
          <div className="boot-box">
            <div className="boot-title">NORTAQ</div>
            <div className="boot-subtitle" style={{ color: 'var(--red)' }}>SYSTEM FAULT // RENDER ERROR</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '1rem 0', fontFamily: 'var(--font-mono)', maxWidth: '420px', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </div>
            <button className="boot-enter" onClick={this.reset}>REBOOT</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
