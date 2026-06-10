/**
 * Per-node metric overlays drawn on the flowchart when the metrics control is
 * enabled. Placement is relative to the node card; `badges` reuse the same
 * homelab-api endpoints as the info-panel live status.
 */
export type MetricBadge =
  | { kind: 'gauge'; label: string; endpoint: string }
  | { kind: 'health'; endpoint: string }
  | { kind: 'uptime'; endpoint: string }
  | { kind: 'argo' }

export type NodeOverlay = {
  placement: 'top' | 'bottom' | 'top-right' | 'above-right'
  badges: MetricBadge[]
}

export const nodeMetrics: Record<string, NodeOverlay> = {
  hetzner: {
    placement: 'top',
    badges: [
      { kind: 'gauge', label: 'CPU', endpoint: '/api/metrics/cpu' },
      { kind: 'gauge', label: 'MEM', endpoint: '/api/metrics/memory' },
    ],
  },
  cluster: {
    placement: 'top-right',
    badges: [
      { kind: 'health', endpoint: '/api/metrics/cluster-health' },
      { kind: 'uptime', endpoint: '/api/metrics/cluster-uptime' },
    ],
  },
  argocd: { placement: 'top', badges: [{ kind: 'argo' }] },
  grafana: {
    placement: 'above-right',
    badges: [{ kind: 'health', endpoint: '/api/metrics/grafana-health' }],
  },
  prometheus: {
    placement: 'above-right',
    badges: [{ kind: 'health', endpoint: '/api/metrics/prometheus-health' }],
  },
}
