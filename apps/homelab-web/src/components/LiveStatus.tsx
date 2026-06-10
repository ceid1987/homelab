import { useMetric } from '../hooks/useMetric'
import ArgoStatus from './ArgoStatus'
import { liveData } from '../flow/liveData'

const POLL_MS = 15000

const scalar = (raw: string | undefined) =>
  raw != null && raw !== '' ? parseFloat(raw) : null

function fmtUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function HealthRow({ label, endpoint }: { label: string; endpoint: string }) {
  const { data, error } = useMetric(endpoint, POLL_MS)
  const series = data?.result ?? []
  const up = series.length > 0 && series.every(s => s.value[1] === '1')
  return (
    <div className="live-row">
      <span className="live-row__label">{label}</span>
      {error ? (
        <span className="live-row__muted">unavailable</span>
      ) : !data ? (
        <span className="live-row__muted">…</span>
      ) : (
        <span className="live-row__status">
          <span className="argo-dot" style={{ background: up ? '#22c55e' : '#ef4444' }} />
          {up ? 'Healthy' : 'Down'}
        </span>
      )}
    </div>
  )
}

function UptimeRow({ label, endpoint }: { label: string; endpoint: string }) {
  const { data, error } = useMetric(endpoint, POLL_MS)
  const secs = scalar(data?.result?.[0]?.value?.[1])
  return (
    <div className="live-row">
      <span className="live-row__label">{label}</span>
      <span className="live-row__value">
        {error ? 'unavailable' : secs == null ? '…' : fmtUptime(secs)}
      </span>
    </div>
  )
}

function GaugeRow({ label, endpoint }: { label: string; endpoint: string }) {
  const { data, error } = useMetric(endpoint, POLL_MS)
  const val = scalar(data?.result?.[0]?.value?.[1])
  const pct = val == null ? null : Math.max(0, Math.min(100, val))
  const color = pct == null ? '#94a3b8' : pct < 70 ? '#22c55e' : pct < 90 ? '#f59e0b' : '#ef4444'
  return (
    <div className="live-gauge">
      <div className="live-gauge__head">
        <span className="live-row__label">{label}</span>
        <span className="live-gauge__val" style={{ color }}>
          {error ? 'unavailable' : pct == null ? '…' : `${pct.toFixed(0)}%`}
        </span>
      </div>
      <div className="live-gauge__track">
        <div
          className="live-gauge__fill"
          style={{ width: pct == null ? '0%' : `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function LiveStatus({ id }: { id: string }) {
  const widgets = liveData[id]
  if (!widgets || widgets.length === 0) return null

  // ArgoCD has its own self-contained section (app list + dropdown).
  if (widgets.some(w => w.kind === 'argo')) return <ArgoStatus />

  return (
    <div className="node-info__section">
      <h3 className="node-info__subtitle">Live status</h3>
      <div className="live-rows">
        {widgets.map((w, i) => {
          switch (w.kind) {
            case 'health':
              return <HealthRow key={i} label={w.label} endpoint={w.endpoint} />
            case 'uptime':
              return <UptimeRow key={i} label={w.label} endpoint={w.endpoint} />
            case 'gauge':
              return <GaugeRow key={i} label={w.label} endpoint={w.endpoint} />
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}
