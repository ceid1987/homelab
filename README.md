# homelab

Personal Kubernetes homelab running on a single Hetzner VPS, built with GitOps principles. Every component of the stack from server provisioning to application deployment is codified and reproducible from a single `terraform apply` and `ansible-playbook` run.

## Stack

| Layer | Tool | Purpose |
|---|---|---|
| Infrastructure | Terraform + hcloud | Hetzner VPS, firewall, SSH keys |
| Configuration | Ansible | k3s install, ArgoCD bootstrap, tooling |
| GitOps | ArgoCD | Syncs all Kubernetes manifests from this repo |
| Secrets | Sealed Secrets | Encrypted secrets safe to commit publicly |
| Ingress | Cloudflare Tunnel | Zero-trust exposure, no open inbound ports |
| Monitoring | kube-prometheus-stack | Prometheus + Grafana + Alertmanager |
| Automation workflows | n8n | *(planned)* |

## Architecture

```
Hetzner CX33 (nbg1)
└── k3s
    ├── argocd          (watches this repo, reconciles cluster state)
    ├── apps
    │   └── cloudflared (outbound tunnel → Cloudflare → grafana.carleid.dev)
    └── monitoring
        ├── prometheus
        ├── grafana
        └── alertmanager
```

Traffic flow: browser → Cloudflare → cloudflared tunnel → cluster service. No inbound firewall rules required.

## Repo structure

```
homelab/
├── terraform/          # Hetzner server + firewall
├── ansible/            # k3s + ArgoCD bootstrap playbook
└── k8s/
    ├── argocd/         # ArgoCD Application manifests
    ├── apps/           # cloudflared deployment, configmap, sealed secret
    ├── monitoring/     # kube-prometheus-stack values + sealed secret
    └── namespaces/     # namespace definitions
```

## Rebuild from scratch

### Prerequisites
- WSL (Windows) or any Linux/macOS machine
- Terraform, Ansible installed locally
- Hetzner Cloud API token
- Ansible Vault password (stored in your password manager)

### 1. Provision the server

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# fill in hcloud_token and ssh_public_key_path
terraform init
terraform apply
```

cloud-init creates the admin user, moves SSH to port 2222, and disables password login automatically.

### 2. Bootstrap the cluster

```bash
cd ansible
# update inventory.yml with the IP from terraform output
ansible-playbook site.yml --ask-vault-pass
```

This installs k3s, restores the Sealed Secrets master key, installs ArgoCD, and points it at this repo. ArgoCD then syncs all applications automatically.

### 3. Done

ArgoCD reconciles cloudflared, Grafana, and Prometheus from the manifests in `k8s/`. No further manual steps.

## Day-to-day workflow

Changes to the cluster are made by editing manifests and pushing to `main`. ArgoCD detects the change and reconciles within ~3 minutes.

```
edit manifest → git push → ArgoCD syncs → cluster updated
```

`kubectl` is only used for debugging and inspection, never for permanent changes.

## Key design decisions

**Cloudflare Tunnel over NodePort/LoadBalancer** — zero inbound firewall rules needed. The cluster reaches out to Cloudflare, not the other way around. No public IP exposed.

**Sealed Secrets over external secrets manager** — the master key is backed up in Ansible Vault and Hetzner Object Storage. Any SealedSecret in this repo can be decrypted by a cluster that has restored the master key, making full rebuilds self-contained.

**ServerSideApply for large CRDs** — kube-prometheus-stack and ArgoCD both ship CRDs that exceed the 262144-byte annotation limit of client-side apply. Both ArgoCD Application manifests and the Ansible bootstrap tasks use `--server-side` to avoid this.

**Single-node by design** — this is a homelab, not production. HA adds complexity that isn't justified for personal tooling. The rebuild automation is the resilience strategy.

## Secrets

No plaintext secrets are committed to this repo. Sensitive values are handled as follows:

| Secret | Where it lives |
|---|---|
| Cloudflare tunnel token | SealedSecret (encrypted, committed) |
| Grafana admin password | SealedSecret (encrypted, committed) |
| Sealed Secrets master key | Ansible Vault + Hetzner Object Storage |
| Hetzner API token | Local `terraform.tfvars` (gitignored) |
| S3 credentials | Ansible Vault (`group_vars/all/vault.yml`) |

## ArgoCD access

Access it via SSH tunnel + port-forward:

**1. Open the SSH tunnel**
```bash
ssh -L 8080:localhost:8080 carl@vps-ip -p 2222 -N
```

**2. Start the port-forward** (run on the VPS):
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

**3. Open** `https://localhost:8080`

Login with username `admin` and the password from:
```bash
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d
```