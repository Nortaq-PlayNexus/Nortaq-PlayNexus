import { useState, useEffect, useCallback, useRef } from 'react'
import { RepoData, TelemetryData, Page } from './types'
import BootSequence from './components/BootSequence'
import Sidebar from './components/Sidebar'
import MissionControl from './components/MissionControl'
import NetworkView from './components/NetworkView'
import ProjectsView from './components/ProjectsView'
import TelemetryView from './components/TelemetryView'
import TechnologyView from './components/TechnologyView'
import ReleasesView from './components/ReleasesView'
import SignalView from './components/SignalView'
import SystemView from './components/SystemView'
import SearchOverlay from './components/SearchOverlay'
import HelpOverlay from './components/HelpOverlay'

const DATA_URL = 'https://raw.githubusercontent.com/Nortaq-PlayNexus/Nortaq-PlayNexus/refs/heads/main/mission-control/data/dashboard.json'

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

function App() {
  const [booted, setBooted] = useState(false)
  const [page, setPage] = useState<Page>('mission-control')
  const [repos, setRepos] = useState<RepoData[]>([])
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [konamiFlash, setKonamiFlash] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const konamiIndex = useRef(0)

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => r.json())
      .then(data => {
        setRepos(data.repos || [])
        setTelemetry(data.telemetry || null)
      })
      .catch(() => {
        setRepos([])
        setTelemetry(null)
      })
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (searchOpen || helpOpen) {
        if (e.key === 'Escape') {
          setSearchOpen(false)
          setHelpOpen(false)
        }
        return
      }

      if (e.key === '/') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        setHelpOpen(true)
        return
      }

      const expected = KONAMI[konamiIndex.current]
      if (e.key === expected) {
        konamiIndex.current++
        if (konamiIndex.current === KONAMI.length) {
          konamiIndex.current = 0
          setKonamiFlash(true)
          setTimeout(() => setKonamiFlash(false), 1000)
          showToast('PHANTOM MODE ACTIVATED // SIGNAL AMPLIFIED')
        }
      } else {
        konamiIndex.current = e.key === KONAMI[0] ? 1 : 0
      }

      const keyMap: Record<string, Page> = {
        '1': 'mission-control',
        '2': 'network',
        '3': 'projects',
        '4': 'telemetry',
        '5': 'technology',
        '6': 'releases',
        '7': 'signal',
        '8': 'system',
      }
      if (keyMap[e.key]) {
        setPage(keyMap[e.key])
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen, helpOpen, showToast])

  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />
  }

  const renderPage = () => {
    switch (page) {
      case 'mission-control':
        return <MissionControl repos={repos} telemetry={telemetry} onNavigate={setPage} />
      case 'network':
        return <NetworkView repos={repos} />
      case 'projects':
        return <ProjectsView repos={repos} />
      case 'telemetry':
        return <TelemetryView repos={repos} telemetry={telemetry} />
      case 'technology':
        return <TechnologyView repos={repos} />
      case 'releases':
        return <ReleasesView repos={repos} />
      case 'signal':
        return <SignalView telemetry={telemetry} repos={repos} />
      case 'system':
        return <SystemView repos={repos} />
      default:
        return <MissionControl repos={repos} telemetry={telemetry} onNavigate={setPage} />
    }
  }

  return (
    <div className="scanlines">
      <div className="app-layout">
        <Sidebar page={page} onNavigate={setPage} />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
      {searchOpen && (
        <SearchOverlay
          repos={repos}
          onSelect={(repo) => {
            setSearchOpen(false)
            setPage('projects')
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {konamiFlash && <div className="konami-flash" />}
      {toast && <div className="toast">{toast}</div>}
      <button className="mobile-nav-toggle" onClick={() => setHelpOpen(true)}>?</button>
    </div>
  )
}

export default App
