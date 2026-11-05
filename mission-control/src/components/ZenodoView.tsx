import { useState } from 'react'
import { ZenodoRecord } from '../types'
import HeaderBar from './HeaderBar'

interface Props {
  records: ZenodoRecord[]
}

export default function ZenodoView({ records }: Props) {
  const [selected, setSelected] = useState<ZenodoRecord | null>(null)

  return (
    <div>
      <HeaderBar title="RESEARCH ARCHIVE // ZENODO" status={<>{records.length} RECORDS</>} />
      <div className="grid-3" style={{ marginBottom: '1rem' }}>
        {records.map(r => (
          <div key={r.id} className="repo-card" onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
            <div className="repo-card-top">
              <span className="case-id">ZEN-{r.id}</span>
              <span className="status-chip st-active">{r.type || 'RECORD'}</span>
            </div>
            <div className="repo-name" style={{ fontSize: '0.95rem' }}>{r.title}</div>
            <div className="repo-desc">{(r.description || '').slice(0, 140) || 'No description'}</div>
            <div className="repo-meta">
              {r.creators.slice(0, 2).map(c => <span key={c}>{c}</span>)}
              <span>{r.publication_date}</span>
              <span className="repo-domain" style={{ borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}>
                {r.downloads} ↓ {r.views} 👁
              </span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="dossier-backdrop" onClick={() => setSelected(null)}>
          <div className="dossier" onClick={e => e.stopPropagation()}>
            <div className="dossier-strip">ZENODO RECORD // {selected.doi}</div>
            <div className="dossier-head">
              <div style={{ minWidth: 0 }}>
                <div className="dossier-title" style={{ fontSize: '1.2rem' }}>{selected.title}</div>
                <div className="dossier-sub">{selected.creators.join(', ')}</div>
              </div>
              <div className="dossier-stamp st-active">{selected.type || 'RECORD'}</div>
            </div>
            <div className="dossier-body">
              <div className="dossier-col">
                <div className="dossier-label">ABSTRACT</div>
                <p className="dossier-brief">{selected.description || 'No description.'}</p>
                <div className="dossier-label">KEYWORDS</div>
                <div className="dossier-chips">
                  {selected.keywords.length > 0
                    ? selected.keywords.map(k => <span key={k} className="chip">{k}</span>)
                    : <span className="chip">untagged</span>}
                </div>
              </div>
              <div className="dossier-col">
                <div className="dossier-label">RECORD METRICS</div>
                <div className="health-row"><span>RECORD ID</span><span>{selected.id}</span></div>
                <div className="health-row"><span>TYPE</span><span>{selected.type}{selected.subtype ? ` / ${selected.subtype}` : ''}</span></div>
                <div className="health-row"><span>PUBLISHED</span><span>{selected.publication_date}</span></div>
                <div className="health-row"><span>LICENSE</span><span>{selected.license || '—'}</span></div>
                <div className="health-row"><span>DOWNLOADS</span><span style={{ color: 'var(--green)' }}>{selected.downloads.toLocaleString()}</span></div>
                <div className="health-row"><span>VIEWS</span><span>{selected.views.toLocaleString()}</span></div>
                <div className="health-row"><span>FILES</span><span>{selected.files.length}</span></div>
                {selected.files.map(f => (
                  <div className="health-row" key={f.key} style={{ fontSize: '0.65rem' }}>
                    <span style={{ color: 'var(--text-dim)' }}>{f.key}</span>
                    <span>{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dossier-foot">
              <a href={selected.doi_url} target="_blank" rel="noopener noreferrer" className="dossier-link">DOI →</a>
              <a href={selected.html_url} target="_blank" rel="noopener noreferrer" className="dossier-link secondary">OPEN RECORD →</a>
              <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={() => setSelected(null)}>CLOSE (ESC)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
