/**
 * Per-node live widgets, rendered in the info panel under "Live status".
 * Each widget maps to a homelab-api metric endpoint. Nodes not listed here
 * simply show no live section.
 */
export type LiveWidget =
  | { kind: 'health'; label: string; endpoint: string }
  | { kind: 'gauge'; label: string; endpoint: string }
  | { kind: 'uptime'; label: string; endpoint: string }
  | { kind: 'argo' }

export const liveData: Record<string, LiveWidget[]> = {
  argocd: [{ kind: 'argo' }],
  cluster: [
    { kind: 'health', label: 'Nodes', endpoint: '/api/metrics/cluster-health' },
    { kind: 'uptime', label: 'Uptime', endpoint: '/api/metrics/cluster-uptime' },
  ],
  hetzner: [
    { kind: 'gauge', label: 'CPU', endpoint: '/api/metrics/cpu' },
    { kind: 'gauge', label: 'Memory', endpoint: '/api/metrics/memory' },
  ],
  grafana: [{ kind: 'health', label: 'Grafana', endpoint: '/api/metrics/grafana-health' }],
  prometheus: [{ kind: 'health', label: 'Prometheus', endpoint: '/api/metrics/prometheus-health' }],
}
