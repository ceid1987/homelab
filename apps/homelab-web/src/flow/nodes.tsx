import {
  SiTerraform,
  SiAnsible,
  SiHetzner,
  SiGithub,
  SiKubernetes,
  SiArgo,
  SiPrometheus,
  SiGrafana,
  SiCloudflare,
  SiReact,
} from 'react-icons/si'
import { LuTerminal, LuBot, LuGitBranch, LuPackage, LuMonitor, LuBox } from 'react-icons/lu'
import type { FlowCardNode } from './FlowCard'
import { computeBoxes } from './layout'

// Colour by role (the palette we established).
const C = {
  green: '#22c55e', // Terraform, Ansible
  gitops: '#a855f7', // Carl, repo, ghcr, ArgoCD
  traffic: '#f0b429', // Cloudflare, cloudflared, Visitor
  monitoring: '#f97316', // Prometheus, Grafana
  hetzner: '#d50c2d',
  operator: '#a36bd8',
  web: '#61dafb',
  workload: '#6366f1', // Workload group border
  group: '#8a909b', // gray container (github.com)
  cluster: '#3b82f6', // blue cluster border
} as const

// Legend: colour → role label, for the flowchart legend control. Order is the
// order shown in the panel.
export const legend: { color: string; label: string }[] = [
  { color: C.gitops, label: 'GitOps' },
  { color: C.green, label: 'Provisioning' },
  { color: C.hetzner, label: 'Infrastructure' },
  { color: C.web, label: 'Web app' },
  { color: C.monitoring, label: 'Monitoring' },
  { color: C.traffic, label: 'Networking' },
]

// Position + size are computed from the semantic column spec in layout.ts.
const boxes = computeBoxes()
const box = (id: string) => {
  const b = boxes[id] ?? { x: 0, y: 0, w: 200, h: 64 }
  return { position: { x: b.x, y: b.y }, width: b.w, height: b.h }
}

export const initialNodes: FlowCardNode[] = [
  // ===== k3s cluster (group) — must precede its children =================
  {
    id: 'cluster',
    type: 'group',
    ...box('cluster'),
    data: { label: 'k3s cluster', color: C.cluster, icon: <SiKubernetes /> },
  },
  // Workload subgroup (nested inside the cluster)
  {
    id: 'workload',
    type: 'group',
    parentId: 'cluster',
    extent: 'parent',
    ...box('workload'),
    data: { label: 'Workload', color: C.workload, icon: <LuBox /> },
  },
  {
    id: 'homelab-web',
    type: 'card',
    parentId: 'workload',
    extent: 'parent',
    ...box('homelab-web'),
    data: { label: 'homelab-web', color: C.web, icon: <SiReact /> },
  },
  {
    id: 'grafana',
    type: 'card',
    parentId: 'workload',
    extent: 'parent',
    ...box('grafana'),
    data: { label: 'Grafana', color: C.monitoring, icon: <SiGrafana /> },
  },
  {
    id: 'prometheus',
    type: 'card',
    parentId: 'workload',
    extent: 'parent',
    ...box('prometheus'),
    data: { label: 'Prometheus', color: C.monitoring, icon: <SiPrometheus /> },
  },
  // Other cluster children
  {
    id: 'argocd',
    type: 'card',
    parentId: 'cluster',
    extent: 'parent',
    ...box('argocd'),
    data: { label: 'ArgoCD', color: C.gitops, icon: <SiArgo /> },
  },
  {
    id: 'operator',
    type: 'card',
    parentId: 'cluster',
    extent: 'parent',
    ...box('operator'),
    data: { label: 'homelab-operator', color: C.operator, icon: <LuBot /> },
  },
  {
    id: 'cloudflared',
    type: 'card',
    parentId: 'cluster',
    extent: 'parent',
    ...box('cloudflared'),
    data: { label: 'cloudflared', color: C.traffic, icon: <SiCloudflare /> },
  },

  // ===== github.com (group) =============================================
  {
    id: 'github',
    type: 'group',
    ...box('github'),
    data: { label: 'github.com', color: C.group, icon: <SiGithub /> },
  },
  {
    id: 'repo',
    type: 'card',
    parentId: 'github',
    extent: 'parent',
    ...box('repo'),
    data: { label: 'ceid1987/homelab', color: C.gitops, icon: <LuGitBranch /> },
  },
  {
    id: 'ghcr',
    type: 'card',
    parentId: 'github',
    extent: 'parent',
    ...box('ghcr'),
    data: { label: 'ghcr.io', color: C.gitops, icon: <LuPackage /> },
  },

  // ===== Standalone nodes ==============================================
  {
    id: 'terraform',
    type: 'card',
    ...box('terraform'),
    data: { label: 'Terraform', color: C.green, icon: <SiTerraform /> },
  },
  {
    id: 'ansible',
    type: 'card',
    ...box('ansible'),
    data: { label: 'Ansible', color: C.green, icon: <SiAnsible /> },
  },
  {
    id: 'developer',
    type: 'card',
    ...box('developer'),
    data: { label: 'Carl', color: C.gitops, icon: <LuTerminal /> },
  },
  {
    id: 'hetzner',
    type: 'card',
    ...box('hetzner'),
    data: { label: 'Hetzner VPS', color: C.hetzner, icon: <SiHetzner /> },
  },
  {
    id: 'cloudflare',
    type: 'card',
    ...box('cloudflare'),
    data: { label: 'Cloudflare', color: C.traffic, icon: <SiCloudflare /> },
  },
  {
    id: 'visitor',
    type: 'card',
    ...box('visitor'),
    data: { label: 'Visitor', color: C.traffic, icon: <LuMonitor /> },
  },
]
