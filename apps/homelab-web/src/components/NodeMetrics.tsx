import { useEffect, useState } from 'react'
import { useMetric } from '../hooks/useMetric'
import { scalar, gaugeColor, fmtUptime, MUTED } from '../flow/metrics'
import { nodeMetrics } from '../flow/nodeMetrics'

const POLL_MS = 15000

function Dot({ color }: { color: string }) {
  return <span className="node-metric__dot" style={{ background: color }} />
}

function GaugeBadge({ label, endpoint }: { label: string; endpoint: string }) {
  const { data, error } = useMetric(endpoint, POLL_MS)
  const val = scalar(data?.result?.[0]?.value?.[1])
  const pct = val == null ? null : Math.max(0, Math.min(100, val))
  return (
    <span className="node-metric">
      <Dot color={pct == null ? MUTED : gaugeColor(pct)} />
      <span className="node-metric__text">
        {label} {error ? 'n/a' : pct == null ? '…' : `${pct.toFixed(0)}%`}
      </span>
    </span>
  )
}

function HealthBadge({ endpoint }: { endpoint: string }) {
  const { data, error } = useMetric(endpoint, POLL_MS)
  const series = data?.result ?? []
  const up = series.length > 0 && series.every(s => s.value[1] === '1')
  return (
    <span className="node-metric">
      <Dot color={!data ? MUTED : up ? '#22c55e' : '#ef4444'} />
      <span className="node-metric__text">{error ? 'n/a' : !data ? '…' : up ? 'Healthy' : 'Down'}</span>
    </span>
  )
}

function UptimeBadge({ endpoint }: { endpoint: string }) {
  const { data, error } = useMetric(endpoint, POLL_MS)
  const secs = scalar(data?.result?.[0]?.value?.[1])
  return (
    <span className="node-metric">
      <span className="node-metric__text node-metric__text--muted">
        {error ? 'n/a' : secs == null ? '…' : `↑ ${fmtUptime(secs)}`}
      </span>
    </span>
  )
}

function ArgoBadge() {
  const health = useMetric('/api/metrics/argocd-health', POLL_MS)
  const apps = useMetric('/api/metrics/argocd-apps', POLL_MS)

  const hs = health.data?.result ?? []
  const up = hs.length > 0 && hs.every(s => s.value[1] === '1')

  const seen = new Set<string>()
  const items = (apps.data?.result ?? []).filter(s => {
    const n = s.metric.name ?? ''
    return seen.has(n) ? false : (seen.add(n), true)
  })
  const total = items.length
  const synced = items.filter(s => s.metric.sync_status === 'Synced').length
  const healthy = items.filter(s => s.metric.health_status === 'Healthy').length

  const error = health.error || apps.error
  const ready = health.data && apps.data
  const color = !ready ? MUTED : !up ? '#ef4444' : synced < total || healthy < total ? '#f59e0b' : '#22c55e'

  return (
    <span className="node-metric">
      <Dot color={color} />
      <span className="node-metric__text">
        {error ? 'n/a' : !ready ? '…' : `${total} apps · ${synced} synced · ${healthy} healthy`}
      </span>
    </span>
  )
}

/** Live metric overlay for a node, shown on the chart when metrics are enabled. */
export default function NodeMetrics({ nodeId, enabled }: { nodeId: string; enabled: boolean }) {
  const cfg = nodeMetrics[nodeId]
  // Stay mounted briefly after disabling so the overlay can fade out (and stop
  // polling once gone).
  const [active, setActive] = useState(enabled)
  useEffect(() => {
    if (enabled) {
      setActive(true)
      return
    }
    const t = setTimeout(() => setActive(false), 250)
    return () => clearTimeout(t)
  }, [enabled])

  if (!cfg || (!enabled && !active)) return null

  return (
    <div className={`node-metrics node-metrics--${cfg.placement} ${enabled ? 'is-on' : 'is-off'} nodrag nopan`}>
      {cfg.badges.map((b, i) => {
        switch (b.kind) {
          case 'gauge':
            return <GaugeBadge key={i} label={b.label} endpoint={b.endpoint} />
          case 'health':
            return <HealthBadge key={i} endpoint={b.endpoint} />
          case 'uptime':
            return <UptimeBadge key={i} endpoint={b.endpoint} />
          case 'argo':
            return <ArgoBadge key={i} />
          default:
            return null
        }
      })}
    </div>
  )
}
