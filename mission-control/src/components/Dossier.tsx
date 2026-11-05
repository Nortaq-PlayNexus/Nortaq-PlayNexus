import { useEffect, useRef } from 'react'
import { RepoData } from '../types'
import { LANG_COLORS, caseFile, colorFor, contactLabel, statusOf } from '../theme'
import { showToast } from '../toast'
import { useFocusTrap } from '../hooks'
import Redacted from './Redacted'

interface Props {
  repo: RepoData
  onClose: () => void
  siblings?: RepoData[]
  onNavigate?: (repo: RepoData) => void
}

/** Full-screen case-file dossier for one repository. */
export default function Dossier({ repo, onClose, siblings, onNavigate }: Props) {
  const dossierRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dossierRef, true)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && onNavigate && siblings) {
        const i = siblings.findIndex(r => r.name === repo.name)
        if (i > 0) onNavigate(siblings[i - 1])
      } else if (e.key === 'ArrowRight' && onNavigate && siblings) {
        const i = siblings.findIndex(r => r.name === repo.name)
        if (i >= 0 && i < siblings.length - 1) onNavigate(siblings[i + 1])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onNavigate, siblings, repo.name])

  const status = statusOf(repo)
  const created = new Date(repo.created_at)
  const pushed = new Date(repo.pushed_at)
  const dateFmt = { day: '2-digit', month: 'short', year: 'numeric' } as const

  const rows: [string, string][] = [
    ['DOMAIN', repo.domain],
    ['PRIMARY LANGUAGE', repo.language || 'UNRECORDED'],
    ['STARS', String(repo.stargazers_count)],
    ['FORKS', String(repo.forks_count)],
    ['OPEN ISSUES', String(repo.open_issues_count)],
    ['REPO SIZE', `${(repo.size / 1024).toFixed(1)} MB`],
    ['DEFAULT BRANCH', repo.default_branch],
    ['FILE OPENED', created.toLocaleDateString('en-US', dateFmt)],
    ['LAST CONTACT', `${pushed.toLocaleDateString('en-US', dateFmt)} · ${contactLabel(repo.days_since_push)}`],
  ]

  return (
    <div className="dossier-backdrop" onClick={onClose}>
      <div className="dossier" ref={dossierRef} onClick={e => e.stopPropagation()}>
        <div className="dossier-strip">
          TOP SECRET // NOFORN &nbsp;·&nbsp; CASE FILE {caseFile(repo.name)} &nbsp;·&nbsp; EYES ONLY
        </div>

        <div className="dossier-head">
          <div style={{ minWidth: 0 }}>
            <div className="dossier-title">{repo.name}</div>
            <div className="dossier-sub">{repo.full_name}</div>
          </div>
          <div className={`dossier-stamp st-${status.toLowerCase()}`}>{status}</div>
        </div>

        <div className="dossier-body">
          <div className="dossier-col">
            <div className="dossier-label">OPERATIONS BRIEF</div>
            <p className="dossier-brief"><Redacted text={repo.description || 'No description on file.'} revealOn="hover" /></p>

            <div className="dossier-label">TAGGED TOPICS</div>
            <div className="dossier-chips">
              {repo.topics.length > 0
                ? repo.topics.map(t => <span key={t} className="chip">{t}</span>)
                : <span className="chip">untagged</span>}
            </div>

            <div className="dossier-label">ACTIVITY SIGNAL</div>
            <div className="tech-bar-track" style={{ height: '12px' }}>
              <div className="tech-bar-fill" style={{ width: `${Math.max(2, repo.activity_score)}%` }} />
            </div>
            <div className="dossier-activity-note">
              {repo.activity_score}/100 OPERATIONAL TEMPO · {contactLabel(repo.days_since_push)} SINCE LAST PUSH
            </div>
          </div>

          <div className="dossier-col">
            <div className="dossier-label">ASSET METRICS</div>
            {rows.map(([k, v]) => (
              <div className="health-row" key={k}>
                <span>{k}</span>
                <span style={{ color: k === 'STARS' ? 'var(--green)' : undefined }}>{v}</span>
              </div>
            ))}

            <div className="dossier-lang-line">
              <span
                className="repo-lang-dot"
                style={{ background: repo.language ? LANG_COLORS[repo.language] || colorFor(repo.domain) : 'var(--text-dim)' }}
              />
              <span>{repo.language || 'UNKNOWN'} · {colorFor(repo.domain)} signature ink</span>
            </div>
          </div>
        </div>

        <div className="dossier-foot">
          {siblings && onNavigate && (
            <>
              <button
                className="back-btn"
                onClick={() => {
                  const i = siblings.findIndex(r => r.name === repo.name)
                  if (i > 0) onNavigate(siblings[i - 1])
                }}
                disabled={siblings.findIndex(r => r.name === repo.name) <= 0}
              >
                ← PREV
              </button>
              <button
                className="back-btn"
                onClick={() => {
                  const i = siblings.findIndex(r => r.name === repo.name)
                  if (i >= 0 && i < siblings.length - 1) onNavigate(siblings[i + 1])
                }}
                disabled={siblings.findIndex(r => r.name === repo.name) >= siblings.length - 1}
              >
                NEXT →
              </button>
            </>
          )}
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="dossier-link">
            OPEN SOURCE FILE →
          </a>
          {repo.homepage && (
            <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="dossier-link secondary">
              FIELD SITE →
            </a>
          )}
          <button
            className="back-btn"
            onClick={() => {
              navigator.clipboard?.writeText(caseFile(repo.name)).then(() => showToast('CASE ID COPIED')).catch(() => {})
            }}
          >
            COPY ID
          </button>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose}>CLOSE FILE (ESC)</button>
        </div>

        <div className="dossier-note">
          SOURCED FROM PUBLIC GITHUB API · NO INVENTED DATA · GENERATED {new Date().toLocaleDateString('en-US', dateFmt)}
        </div>
      </div>
    </div>
  )
}
