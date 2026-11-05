import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error) { console.error('Mission Control crashed:', error) }
  render() {
    if (this.state.error) {
      return (
        <div className="boot-screen">
          <div className="boot-box">
            <div className="boot-title">NORTAQ</div>
            <div className="boot-subtitle" style={{ color: 'var(--red)' }}>SYSTEM FAULT // RENDER ERROR</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '1rem 0', fontFamily: 'var(--font-mono)', maxWidth: '420px', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </div>
            <button className="boot-enter" onClick={() => { this.setState({ error: null }); window.location.reload() }}>
              REBOOT
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
