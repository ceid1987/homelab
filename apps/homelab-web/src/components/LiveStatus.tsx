import { useMetric } from '../hooks/useMetric'
import ArgoStatus from './ArgoStatus'
import { liveData } from '../flow/liveData'
import { scalar, gaugeColor, fmtUptime, MUTED } from '../flow/metrics'

const POLL_MS = 15000

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
  const color = pct == null ? MUTED : gaugeColor(pct)
  return (
    <div className="live-gauge">
      <div className="live-gauge__head">
        <span className="live-row__label">{label}</span>
        <span className="live-gauge__val" style={{ color }}>
          {error ? 'unavailable' : pct == null ? '…' : `${pct.toFixed(0)}%`}
        </span>
      </div>
      <div className="live-gauge__track">
        {/* full-width green→red gradient, revealed left-to-right by the value */}
        <div
          className="live-gauge__fill"
          style={{ clipPath: `inset(0 ${pct == null ? 100 : 100 - pct}% 0 0)` }}
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
