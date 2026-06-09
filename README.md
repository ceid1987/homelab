# homelab

Personal Kubernetes homelab running on a single Hetzner VPS, built with GitOps principles. Every component of the stack from server provisioning to application deployment is codified and reproducible from a single `terraform apply` and `ansible-playbook` run.

Currently exposes: [homelab.carleid.dev](https://homelab.carleid.dev), [grafana.carleid.dev](https://grafana.carleid.dev)

## Stack

| Layer | Tool | Purpose |
|---|---|---|
| Infrastructure | Terraform + hcloud | Hetzner VPS, firewall, SSH keys |
| Configuration | Ansible | k3s install, ArgoCD bootstrap, tooling |
| GitOps | ArgoCD | Syncs all Kubernetes manifests from this repo |
| Secrets | Sealed Secrets (HashiCorp Vault **planned**) | Encrypted secrets |
| Ingress | Cloudflare Tunnel | Zero-trust exposure, no open inbound ports |
| Monitoring | kube-prometheus-stack | Prometheus + Grafana + Alertmanager |
| Operator | homelab-operator (Go) | Automates ArgoCD Application + namespace provisioning |


## Architecture

```
Hetzner CX33/CX32 (nbg1)
└── k3s
    ├── argocd              (watches this repo, reconciles cluster state)
    ├── operator-system
    │   └── homelab-operator (custom Kubernetes operator, written in Go)
    ├── apps
    │   └── cloudflared     (outbound tunnel → Cloudflare → grafana.carleid.dev)
    └── monitoring
        ├── prometheus
        ├── grafana
        └── alertmanager
```

Traffic flow: browser → Cloudflare → cloudflared tunnel → cluster service. No inbound firewall rules required.

## Repo structure

```
homelab/
├── operator/           # Go source code for the homelab-operator
├── terraform/          # Hetzner server + firewall
├── ansible/            # k3s + ArgoCD bootstrap playbook
└── k8s/
    ├── argocd/         # ArgoCD Application manifests
    ├── apps/           # cloudflared deployment, configmap, sealed secret
    ├── monitoring/     # kube-prometheus-stack values + sealed secret
    ├── namespaces/     # namespace definitions
    └── operator/       # homelab-operator deployment manifests (managed by ArgoCD)
```

## homelab-operator

A custom Kubernetes operator written in Go using [controller-runtime](https://github.com/kubernetes-sigs/controller-runtime). It introduces a `HomelabApp` custom resource that encodes the repetitive work of adding a new application to the cluster.

Applying a single manifest:

```yaml
apiVersion: homelab.carleid.dev/v1alpha1
kind: HomelabApp
metadata:
  name: my-app
  namespace: default
spec:
  repo: https://github.com/ceid1987/homelab
  path: k8s/apps/my-app
  domain: my-app.carleid.dev
  targetNamespace: my-app
```

Automatically triggers the operator to:
1. Create the target namespace
2. Create an ArgoCD `Application` pointing at the specified repo path

The operator image is published at `ghcr.io/ceid1987/homelab-operator` and deployed to the cluster via ArgoCD from `k8s/operator/`.

## Rebuild from scratch

### Prerequisites
- Cloudflare account with domain configured on Cloudflare
- A Cloudflare tunnel and its token
- WSL (Windows) or any Linux/macOS machine
- Terraform, Ansible installed locally
- Hetzner Cloud API token
- Ansible Vault password (stored in password manager)

### 1. Provision the server

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# fill in hcloud_token and ssh_public_key_path
terraform init
terraform apply
```

`cloud-init` creates the admin user, moves SSH to port 2222, and disables password login automatically.

### 2. Bootstrap the cluster

```bash
cd ansible
# update inventory.yml with the IP from terraform output
ansible-playbook site.yml --ask-vault-pass
```

This installs k3s, restores the Sealed Secrets master key, installs ArgoCD, and points it at this repo. ArgoCD then syncs all applications automatically.

### 3. Done

ArgoCD reconciles cloudflared, Grafana, Prometheus, and the homelab-operator from the manifests in `k8s/`. No further manual steps.

## Day-to-day workflow

Changes to the cluster are made by editing manifests and pushing to `main`. ArgoCD detects the change and reconciles within ~3 minutes.

```
edit manifest → git push → ArgoCD syncs → cluster updated
```

To add a new application, create a `HomelabApp` manifest and commit it. The operator handles the rest.

`kubectl` is only used for debugging and inspection.

## Design decisions

**Cloudflare Tunnel over NodePort/LoadBalancer** — zero inbound firewall rules. Cluster reaches out to Cloudflare.

**Sealed Secrets over external secrets manager** — the master key is backed up in Ansible Vault and Hetzner Object Storage. 

**ServerSideApply for large CRDs** — kube-prometheus-stack and ArgoCD both ship CRDs that exceed the 262144-byte annotation limit of client-side apply. Both ArgoCD Application manifests and the Ansible bootstrap tasks use `--server-side` to avoid this.

**Single-node** — this is a homelab :)

**Custom operator over manual manifests** — repetitive patterns (namespace + ArgoCD Application per app) are encoded once in Go rather than copy-pasted. The operator is itself managed by ArgoCD, making it part of the GitOps flow.

## Secrets

No plaintext secrets are committed. Sensitive values are handled as follows:

| Secret | Where it lives |
|---|---|
| Cloudflare tunnel token | SealedSecret (encrypted, committed) |
| Grafana admin password | SealedSecret (encrypted, committed) |
| Sealed Secrets master key | Ansible Vault + Hetzner Object Storage |
| Hetzner API token | Local `terraform.tfvars` (gitignored) |
| S3 credentials | Ansible Vault (`group_vars/all/vault.yml`) |
