/**
 * Per-edge ("action") descriptions shown in the info panel when an action /
 * line is selected. Keyed by edge id (see edges.ts).
 */
export const actionInfo: Record<string, { title?: string; desc: string }> = {
  'e-tf': {
    title: 'terraform apply',
    desc: 'Carl runs `terraform apply`, which provisions the Hetzner VPS and cloud resources from code.',
  },
  'e-playbook': {
    title: 'Run playbook',
    desc: 'Carl runs the Ansible playbook to bootstrap the freshly-provisioned server (installs k3s, ArgoCD, Sealed Secrets…).',
  },
  'e-provision': {
    title: 'provision',
    desc: 'Terraform calls the Hetzner API to create the VPS, firewall and SSH keys.',
  },
  'e-ssh': {
    title: 'SSH bootstrap',
    desc: 'Ansible connects over SSH to configure the server and install the cluster components.',
  },
  'e-hetzner-cluster': {
    title: 'runs the cluster',
    desc: 'The Hetzner VPS hosts the single-node k3s cluster that everything else runs on.',
  },
  'e-push': {
    title: 'git push',
    desc: 'Carl pushes infrastructure code and application manifests to the GitHub repository.',
  },
  'e-repo-ghcr': {
    title: 'build & push image',
    desc: 'CI builds the container image from the repo and pushes it to the ghcr.io registry.',
  },
  'e-argo-github': {
    title: 'detect & pull',
    desc: 'ArgoCD watches the repo, detects changes, and pulls the latest manifests to reconcile the cluster.',
  },
  'e-op-argo': {
    title: 'creates ArgoCD App',
    desc: 'The homelab-operator watches HomelabApp resources and creates the matching ArgoCD Application.',
  },
  'e-argo-workload': {
    title: 'deploys workloads',
    desc: 'ArgoCD applies the manifests, deploying the workloads (pods, services…) into the cluster.',
  },
  'e-graf-prom': {
    title: 'queries',
    desc: 'Grafana queries Prometheus for the metrics it visualises.',
  },
  'e-cfd-web': {
    title: 'routes to homelab-web',
    desc: 'cloudflared routes incoming requests to the homelab-web service.',
  },
  'e-cfd-graf': {
    title: 'routes to Grafana',
    desc: 'cloudflared routes incoming requests for grafana.carleid.dev to Grafana.',
  },
  'e-cf-cfd': {
    title: 'via outbound tunnel',
    desc: 'Cloudflare forwards requests down the tunnel that cloudflared dialed outbound — so no inbound ports are open.',
  },
  'e-visitor-cf': {
    title: 'HTTPS',
    desc: 'A visitor sends an HTTPS request to Cloudflare, which fronts the homelab.',
  },
}
