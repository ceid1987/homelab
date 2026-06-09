/**
 * Per-node descriptions shown in the menu when a node is clicked.
 * `[label](id)` markers become clickable links that focus another node.
 */
export const nodeInfo: Record<string, { desc: string }> = {
  developer: {
    desc:
      'Carl, the developer. He writes infrastructure code and app manifests on his machine, runs [Terraform](terraform) and [Ansible](ansible) to provision the server, and pushes changes to the [repo](repo).',
  },
  repo: {
    desc:
      'The Git repository (ceid1987/homelab) holding all Terraform, Ansible and Kubernetes manifests. [ArgoCD](argocd) watches it for changes, and images are built and pushed to [ghcr.io](ghcr).',
  },
  ghcr: {
    desc:
      'GitHub Container Registry. Stores the container images built from the [repo](repo). The [k3s cluster](cluster) pulls these images when deploying [workloads](workload).',
  },
  github: {
    desc: 'GitHub hosts the [repo](repo) and the [ghcr.io](ghcr) container registry.',
  },
  argocd: {
    desc:
      'ArgoCD is the GitOps controller. It detects changes in the [repo](repo), pulls manifests and images, and applies [workloads](workload) to the cluster. The [operator](operator) creates the ArgoCD Applications it reconciles.',
  },
  operator: {
    desc:
      'The homelab-operator watches for HomelabApp objects and creates the matching ArgoCD Application, telling [ArgoCD](argocd) what to deploy.',
  },
  workload: {
    desc:
      'The Kubernetes workloads (pods, services, etc.) deployed by [ArgoCD](argocd) — including [homelab-web](homelab-web), [Grafana](grafana) and [Prometheus](prometheus).',
  },
  'homelab-web': {
    desc:
      'This web app. Served to visitors through [cloudflared](cloudflared), and it proxies to [Grafana](grafana) for embedded dashboards.',
  },
  grafana: {
    desc:
      'Grafana dashboards. Queries [Prometheus](prometheus) for metrics and is exposed publicly through [cloudflared](cloudflared).',
  },
  prometheus: {
    desc: 'Prometheus scrapes and stores cluster metrics, which [Grafana](grafana) then queries.',
  },
  cloudflared: {
    desc:
      'The Cloudflare Tunnel daemon. Routes external traffic from [Cloudflare](cloudflare) to [homelab-web](homelab-web) and [Grafana](grafana) — with no inbound ports open.',
  },
  cluster: {
    desc:
      'The k3s cluster running on the [Hetzner VPS](hetzner). It contains [ArgoCD](argocd), the [operator](operator), monitoring, and the deployed [workloads](workload).',
  },
  terraform: {
    desc:
      'Terraform provisions the [Hetzner VPS](hetzner) and cloud resources. Run by [Carl](developer) from his machine.',
  },
  ansible: {
    desc:
      'Ansible bootstraps the server over SSH — installing k3s, ArgoCD and more on the [Hetzner VPS](hetzner). Run by [Carl](developer).',
  },
  hetzner: {
    desc:
      'The Hetzner VPS — a single-node server provisioned by [Terraform](terraform) and configured by [Ansible](ansible). It runs the [k3s cluster](cluster).',
  },
  cloudflare: {
    desc:
      "Cloudflare's edge. Receives visitor HTTPS requests and routes them through the tunnel to [cloudflared](cloudflared) inside the cluster.",
  },
  visitor: {
    desc:
      'A visitor browsing the site. Their HTTPS requests hit [Cloudflare](cloudflare) and are tunnelled to [homelab-web](homelab-web).',
  },
}
