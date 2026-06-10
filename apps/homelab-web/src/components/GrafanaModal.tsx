import { useEffect } from 'react'
import { LuX } from 'react-icons/lu'
import './GrafanaModal.css'

const dashboards = [
  {
    title: 'K8S / Compute Resources / Cluster',
    description: 'Overview of cluster resource & network utilization',
    url: 'https://grafana.carleid.dev/public-dashboards/2f9d3e0f7c894327aee45f732a4edd48',
  },
]

export default function GrafanaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="gf-overlay" role="dialog" aria-modal="true" aria-labelledby="gf-title" onClick={onClose}>
      <div className="gf-card" onClick={e => e.stopPropagation()}>
        <button type="button" className="gf-close" onClick={onClose} aria-label="Close">
          <LuX />
        </button>
        <h2 id="gf-title" className="gf-card__title">
          Grafana dashboards
        </h2>
        <ul className="gf-list">
          {dashboards.map(d => (
            <li key={d.url}>
              <a className="gf-item" href={d.url} target="_blank" rel="noreferrer">
                <span className="gf-item__name">{d.title}</span>
                <span className="gf-item__desc">{d.description}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="gf-more">More dashboards on the way…</p>
      </div>
    </div>
  )
}
