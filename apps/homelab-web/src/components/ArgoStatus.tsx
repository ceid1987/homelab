import { useState } from 'react'
import { useMetric } from '../hooks/useMetric'
import type { PromSeries } from '../hooks/useMetric'

const POLL_MS = 15000

// Status -> dot/badge color.
const syncColor = (s: string) =>
  s === 'Synced' ? '#22c55e' : s === 'OutOfSync' ? '#f59e0b' : '#94a3b8'

const healthColor = (s: string) =>
  ({
    Healthy: '#22c55e',
    Progressing: '#3b82f6',
    Degraded: '#ef4444',
    Missing: '#f59e0b',
    Suspended: '#94a3b8',
  })[s] ?? '#94a3b8'

type App = {
  name: string
  sync: string
  health: string
  namespace: string
  autosync: boolean
}

const toApp = (s: PromSeries): App => ({
  name: s.metric.name ?? '(unknown)',
  sync: s.metric.sync_status ?? 'Unknown',
  health: s.metric.health_status ?? 'Unknown',
  namespace: s.metric.dest_namespace ?? '',
  autosync: s.metric.autosync_enabled === 'true',
})

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="argo-badge"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      {label}
    </span>
  )
}

export default function ArgoStatus() {
  const [open, setOpen] = useState(false)
  const health = useMetric('/api/metrics/argocd-health', POLL_MS)
  const apps = useMetric('/api/metrics/argocd-apps', POLL_MS)

  const healthSeries = health.data?.result ?? []
  const controllerUp =
    healthSeries.length > 0 && healthSeries.every(s => s.value[1] === '1')

  // Dedupe by app name (one series per app expected, but guard anyway).
  const seen = new Set<string>()
  const list = (apps.data?.result ?? [])
    .map(toApp)
    .filter(a => (seen.has(a.name) ? false : (seen.add(a.name), true)))
    .sort((a, b) => a.name.localeCompare(b.name))

  const syncedCount = list.filter(a => a.sync === 'Synced').length
  const healthyCount = list.filter(a => a.health === 'Healthy').length

  const error = health.error || apps.error
  const loading = (health.loading || apps.loading) && list.length === 0 && !error

  return (
    <div className="node-info__section">
      <h3 className="node-info__subtitle">Live status</h3>

      {error ? (
        <p className="argo-msg argo-msg--error">Couldn't reach ArgoCD metrics ({error}).</p>
      ) : loading ? (
        <p className="argo-msg">Loading…</p>
      ) : (
        <div className="argo">
          <button
            type="button"
            className="argo-summary"
            onClick={() => setOpen(o => !o)}
            disabled={list.length === 0}
            aria-expanded={open}
          >
            <span className="argo-summary__text">
              <span className="argo-health">
                <span
                  className="argo-dot"
                  style={{ background: controllerUp ? '#22c55e' : '#ef4444' }}
                />
                ArgoCD: {controllerUp ? 'Healthy' : 'Down'}
              </span>
              {list.length > 0 && (
                <span className="argo-counts">
                  {list.length} apps · {syncedCount} Synced · {healthyCount} Healthy
                </span>
              )}
            </span>
            {list.length > 0 && (
              <span className={`argo-chevron${open ? ' argo-chevron--open' : ''}`} aria-hidden>
                ▾
              </span>
            )}
          </button>

          {list.length > 0 && (
            <div className={`argo-list-wrap${open ? ' argo-list-wrap--open' : ''}`}>
              <ul className="argo-list">
                {list.map(a => (
                  <li key={a.name} className="argo-app">
                    <div className="argo-app__main">
                      <span className="argo-app__name">{a.name}</span>
                      {a.namespace && <span className="argo-app__ns">{a.namespace}</span>}
                    </div>
                    <div className="argo-app__badges">
                      <Badge label={a.sync} color={syncColor(a.sync)} />
                      <Badge label={a.health} color={healthColor(a.health)} />
                      {a.autosync && <span className="argo-app__auto" title="Auto-sync enabled">auto</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
