import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { RepoData, TelemetryData, Page, ProfileData, OrganizationData, StarredRepoData, GistData, ZenodoRecord } from './types'
import BootSequence from './components/BootSequence'
import Sidebar from './components/Sidebar'
import SearchOverlay from './components/SearchOverlay'
import HelpOverlay from './components/HelpOverlay'
import Dossier from './components/Dossier'
import StatusBar from './components/StatusBar'
import PhosphorTrail from './components/PhosphorTrail'
import EntropyField from './components/EntropyField'
import CovertOverlay from './components/CovertOverlay'
import OpsLog from './components/OpsLog'
import ZenodoView from './components/ZenodoView'
import { logAction, getOpsLog, exportOpsLog } from './opslog'
import { useToast, showToast } from './toast'

// Lazy-loaded views (code-split)
const MissionControl = lazy(() => import('./components/MissionControl'))
const NetworkView = lazy(() => import('./components/NetworkView'))
const ProjectsView = lazy(() => import('./components/ProjectsView'))
const TelemetryView = lazy(() => import('./components/TelemetryView'))
const TechnologyView = lazy(() => import('./components/TechnologyView'))
const ReleasesView = lazy(() => import('./components/ReleasesView'))
const SignalView = lazy(() => import('./components/SignalView'))
const SystemView = lazy(() => import('./components/SystemView'))

const DATA_URL = `${import.meta.env.BASE_URL}data/dashboard.json`
const FALLBACK_URL = 'https://raw.githubusercontent.com/Nortaq-PlayNexus/Nortaq-PlayNexus/refs/heads/main/mission-control/data/dashboard.json'

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

function App() {
  const [booted, setBooted] = useState(false)
  const [page, setPage] = useState<Page>('mission-control')
  const [repos, setRepos] = useState<RepoData[]>([])
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationData[]>([])
  const [starred, setStarred] = useState<StarredRepoData[]>([])
  const [gists, setGists] = useState<GistData[]>([])
  const [zenodoRecords, setZenodoRecords] = useState<ZenodoRecord[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [opsLogEntries, setOpsLogEntries] = useState(() => getOpsLog())
  const mainRef = useRef<HTMLElement>(null)
  const [dossierRepo, setDossierRepo] = useState<RepoData | null>(null)
  const [konamiFlash, setKonamiFlash] = useState(false)
  const [phantom, setPhantom] = useState(() => {
    try { return sessionStorage.getItem('phantom') === '1' } catch { return false }
  })
  const toast = useToast()
  const konamiIndex = useRef(0)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(DATA_URL)
        if (!r.ok) throw new Error(`local ${r.status}`)
        return await r.json()
      } catch {
        const r = await fetch(FALLBACK_URL)
        if (!r.ok) throw new Error(`remote ${r.status}`)
        return await r.json()
      }
    }
    load()
      .then(data => {
        setRepos(data.repos || [])
        setTelemetry(data.telemetry || null)
        setProfile(data.profile || null)
        setOrganizations(data.organizations || [])
        setStarred(data.starred || [])
        setGists(data.gists || [])
        setZenodoRecords(data.zenodo_records || [])
        setStatus('ok')
      })
      .catch(() => {
        setRepos([])
        setTelemetry(null)
        setStatus('error')
      })
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
          setTimeout(() => setKonamiFlash(false), 1400)
          setPhantom(p => {
            const n = !p
            try { sessionStorage.setItem('phantom', n ? '1' : '0') } catch { /* ignore */ }
            showToast(n ? 'PHANTOM MODE // ENGAGED' : 'PHANTOM MODE // DISENGAGED')
            return n
          })
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
        '9': 'zenodo',
      }
      if (keyMap[e.key]) {
        setPage(keyMap[e.key])
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen, helpOpen])

  // ---- hash-based routing (deep links + back/forward) ----
  useEffect(() => {
    const valid = new Set(['mission-control','network','projects','telemetry','technology','releases','signal','system'])
    const fromHash = () => {
      const h = window.location.hash.replace(/^#/, '')
      if (valid.has(h)) setPage(h as Page)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  useEffect(() => {
    const h = `#${page}`
    if (window.location.hash !== h) {
      try { history.pushState(null, '', h) } catch { /* ignore */ }
    }
  }, [page])
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    if (!fine) return
    const root = document.documentElement
    let currentTilt: HTMLElement | null = null
    let rafId = 0
    let pending: MouseEvent | null = null
    const apply = () => {
      rafId = 0
      const e = pending
      pending = null
      if (!e) return
      root.style.setProperty('--mx', `${e.clientX}px`)
      root.style.setProperty('--my', `${e.clientY}px`)
      const el = (e.target as HTMLElement | null)?.closest?.('.metric, .repo-card, .release-card, .freshness-cell') as HTMLElement | null
      if (el && el !== currentTilt) {
        if (currentTilt) { currentTilt.style.removeProperty('--rx'); currentTilt.style.removeProperty('--ry') }
        currentTilt = el
      }
      if (el) {
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        el.style.setProperty('--rx', `${(-py * 7).toFixed(2)}deg`)
        el.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`)
      } else if (currentTilt) {
        currentTilt.style.removeProperty('--rx')
        currentTilt.style.removeProperty('--ry')
        currentTilt = null
      }
    }
    const onMove = (e: MouseEvent) => {
      pending = e
      if (!rafId) rafId = requestAnimationFrame(apply)
    }
    const onLeave = () => {
      if (currentTilt) { currentTilt.style.removeProperty('--rx'); currentTilt.style.removeProperty('--ry'); currentTilt = null }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // ---- ops log: record page navigations ----
  useEffect(() => {
    logAction('NAVIGATE', page)
    setOpsLogEntries(getOpsLog())
  }, [page])
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => setShowScrollTop(el.scrollTop > 400)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />
  }

  if (status === 'loading') {
    return (
      <div className="boot-screen">
        <div className="boot-box">
          <div className="boot-title">NORTAQ</div>
          <div className="boot-subtitle">ESTABLISHING UPLINK...</div>
          <div className="boot-progress-container">
            <div className="boot-progress-bar" style={{ width: '40%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="boot-screen">
        <div className="boot-box">
          <div className="boot-title">NORTAQ</div>
          <div className="boot-subtitle" style={{ color: 'var(--red)' }}>SIGNAL LOST // NO DATA</div>
          <button className="boot-enter" onClick={() => window.location.reload()}>RETRY UPLINK</button>
        </div>
      </div>
    )
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
        return <SystemView repos={repos} profile={profile} />
      case 'zenodo':
        return <ZenodoView records={zenodoRecords} />
      default:
        return <MissionControl repos={repos} telemetry={telemetry} onNavigate={setPage} />
    }
  }

  return (
    <div className={`scanlines ${mobileNavOpen ? 'mobile-nav-open' : ''} ${phantom ? 'phantom-mode' : ''}`}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <EntropyField threatIndex={0.3} opacity={0.06} />
      </div>
      <div className="app-layout">
        <Sidebar page={page} onNavigate={(p) => { setPage(p); setMobileNavOpen(false) }} />
        <main className="main-content" ref={mainRef}>
          <div key={page} className="view-stage">
            <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-dim)', fontSize: '0.7rem', letterSpacing: '0.15em' }}>LOADING VIEW...</div>}>
              {renderPage()}
            </Suspense>
          </div>
          <OpsLog
            entries={opsLogEntries}
            onExport={() => { exportOpsLog(); showToast('OPS LOG EXPORTED') }}
          />
        </main>
      </div>
      {searchOpen && (
        <SearchOverlay
          repos={repos}
          onSelectRepo={(repo) => { setDossierRepo(repo) }}
          onNavigate={(p) => setPage(p as Page)}
          onClose={() => setSearchOpen(false)}
        />
      )}
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {konamiFlash && <div className="konami-flash" />}
      {toast && <div className="toast">{toast}</div>}
      {dossierRepo && <Dossier repo={dossierRepo} onClose={() => setDossierRepo(null)} />}
      <div className="pointer-spotlight" aria-hidden="true" />
      <PhosphorTrail />
      <CovertOverlay />
      {showScrollTop && (
        <button
          className="scroll-top-btn"
          onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
      <StatusBar page={page} repoCount={repos.length} phantom={phantom} />
      <button className="mobile-nav-toggle" onClick={() => setMobileNavOpen(v => !v)}>☰</button>
    </div>
  )
}

export default App
