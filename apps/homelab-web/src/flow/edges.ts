import { MarkerType } from '@xyflow/react'
import type { Edge } from '@xyflow/react'

const arrow = { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 14, height: 14 }

type Opts = { label?: string; dashed?: boolean; arrow?: boolean }

function edge(
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  { label, dashed = false, arrow: withArrow = true }: Opts = {},
): Edge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'labeled',
    data: { label, dashed },
    ...(withArrow ? { markerEnd: arrow } : {}),
  }
}

/**
 * Edge style convention:
 *   dashed = control / build / deploy plane (IaC, CI/CD, GitOps — declarative)
 *   solid  = data / request plane (live runtime traffic + metric queries)
 */
export const allEdges: Edge[] = [
  // ---- control plane (dashed) ----
  edge('e-tf', 'developer', 's-left', 'terraform', 't-left', { label: 'terraform apply', dashed: true }),
  edge('e-playbook', 'developer', 's-top', 'ansible', 't-bottom', { label: 'Run playbook', dashed: true }),
  edge('e-provision', 'terraform', 's-right', 'hetzner', 't-left', { label: 'provision', dashed: true }),
  edge('e-ssh', 'ansible', 's-right', 'hetzner', 't-bottom', { label: 'SSH Bootstrap env', dashed: true }),
  edge('e-hetzner-cluster', 'hetzner', 's-right', 'cluster', 't-top', { dashed: true, arrow: false }),

  edge('e-push', 'developer', 's-right', 'repo', 't-left', { label: 'git push', dashed: true }),
  edge('e-repo-ghcr', 'repo', 's-bottom', 'ghcr', 't-top', { label: 'build & push image', dashed: true }),
  edge('e-argo-github', 'argocd', 's-left', 'github', 't-right', {
    label: 'detect changes\npull manifest(s)',
    dashed: true,
  }),
  edge('e-op-argo', 'operator', 's-top', 'argocd', 't-bottom', {
    label: 'watches for HomelabApp objects\ncreates argocd app',
    dashed: true,
  }),
  edge('e-argo-workload', 'argocd', 's-right', 'workload', 't-left', {
    label: 'deploys workload(s)\nfrom argocd Application object(s)',
    dashed: true,
  }),

  // ---- data / request plane (solid) ----
  edge('e-graf-prom', 'grafana', 's-bottom', 'prometheus', 't-top', { label: 'queries' }),
  edge('e-cfd-web', 'cloudflared', 's-left', 'homelab-web', 't-right', { label: 'routes to' }),
  edge('e-cfd-graf', 'cloudflared', 's-left', 'grafana', 't-right', { label: 'routes to' }),
  // request flows right→left: visitor → cloudflare → cloudflared → app
  edge('e-cf-cfd', 'cloudflare', 's-left', 'cloudflared', 't-right', { label: 'via outbound tunnel' }),
  edge('e-visitor-cf', 'visitor', 's-left', 'cloudflare', 't-right', { label: 'HTTPS' }),
]
