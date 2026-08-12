# homelab

Personal Kubernetes homelab running on a single Hetzner VPS, built with GitOps principles. Every component of the stack from server provisioning to application deployment is codified and reproducible from a single `terraform apply` and `ansible-playbook` run.

Currently exposes: [homelab.carleid.dev](https://homelab.carleid.dev), [grafana.carleid.dev](https://grafana.carleid.dev)

## Stack

| Layer | Tool | Purpose |
|---|---|---|
| Infrastructure | Terraform + hcloud | Hetzner VPS, firewall, SSH keys |
| Configuration | Ansible | k3s install, ArgoCD bootstrap, tooling |
| GitOps | ArgoCD | Syncs the platform from this repo |
| Discovery | ArgoCD ApplicationSet | Adopts any org repo containing a `deploy/` directory |
| Secrets | Sealed Secrets (HashiCorp Vault **planned**) | Encrypted secrets |
| Ingress | Cloudflare Tunnel | Zero-trust exposure, no open inbound ports |
| Monitoring | kube-prometheus-stack | Prometheus + Grafana + Alertmanager |
| Operator | homelab-operator (Go) | Publishes annotated Services through the tunnel |


## Architecture

```
Hetzner CX33/CX32 (nbg1)
└── k3s
    ├── argocd              (watches this repo; ApplicationSet scans the org)
    ├── operator-system
    │   └── homelab-operator (custom Kubernetes operator, written in Go)
    ├── apps
    │   └── cloudflared     (outbound tunnel → Cloudflare)
    ├── homelab-web         (discovered from carleid-homelab/homelab-web)
    ├── homelab-api         (discovered from carleid-homelab/homelab-api)
    └── monitoring
        ├── prometheus
        ├── grafana
        └── alertmanager
```

Traffic flow: browser → Cloudflare → cloudflared tunnel → cluster service. No inbound firewall rules required.

## Repo structure

This repo holds the platform. Applications live in their own repositories under the
[carleid-homelab](https://github.com/carleid-homelab) organisation, each carrying its own
manifests.

```
carleid-homelab/homelab/    # this repo — platform only
├── terraform/              # Hetzner server + firewall
├── ansible/                # k3s + ArgoCD bootstrap playbook
└── k8s/
    ├── argocd/             # ArgoCD Applications + the ApplicationSet
    ├── platform/           # cloudflared, ArgoCD ServiceMonitor
    ├── monitoring/         # kube-prometheus-stack values + sealed secret
    └── namespaces/         # namespace definitions

carleid-homelab/            # one repo per application
├── homelab-web/            # React dashboard,  source + deploy/
├── homelab-api/            # Go metrics proxy, source + deploy/
└── homelab-operator/       # the operator's Go source
```

## Adding an application

An `ApplicationSet` in `k8s/argocd/appset.yaml` scans the organisation and adopts every repo
containing a `deploy/` directory:

```yaml
generators:
  - scmProvider:
      github:
        organization: carleid-homelab
      filters:
        - pathsExist: [deploy]
```

So adding an application to the cluster is: create the repo, add `deploy/`, push. ArgoCD
creates the `Application` and its namespace. Nothing in this repo changes.

To expose it publicly, annotate its Service with the hostname:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  annotations:
    homelab.carleid.dev/domain: my-app.carleid.dev
```

Each app repo builds its own image in CI, writes the immutable tag into its manifests, and
publishes the result to a `deploy` branch. ArgoCD tracks that branch, never `main`.

## homelab-operator

[carleid-homelab/homelab-operator](https://github.com/carleid-homelab/homelab-operator) — a
controller written in Go with [controller-runtime](https://github.com/kubernetes-sigs/controller-runtime).

It watches Services carrying `homelab.carleid.dev/domain` and rebuilds the cloudflared ingress
list from them, then stamps a digest of the rendered config onto the tunnel's pod template so
the pods roll and read it — a locally-managed cloudflared only reads its config at startup.

Rebuilding the list wholesale rather than patching individual rules means deleted Services and
removed annotations need no special handling, and no finalizer is required.

The image is published at `ghcr.io/carleid-homelab/homelab-operator` and deployed by ArgoCD
from that repo's `deploy` branch.

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

ArgoCD reconciles cloudflared, Grafana, Prometheus, and the homelab-operator from the manifests in `k8s/`, then discovers the applications from the organisation. No further manual steps.

## Day-to-day workflow

Changes to the cluster are made by editing manifests and pushing to `main`. ArgoCD detects the change and reconciles within ~3 minutes.

```
edit manifest → git push → ArgoCD syncs → cluster updated
```

Application changes are pushed to their own repositories, where CI builds the image and ArgoCD picks up the result. This repo only changes when the platform itself does.

`kubectl` is only used for debugging and inspection.

## Design decisions

**Cloudflare Tunnel over NodePort/LoadBalancer** — zero inbound firewall rules. Cluster reaches out to Cloudflare.

**Sealed Secrets over external secrets manager** — the master key is backed up in Ansible Vault and Hetzner Object Storage. 

**ServerSideApply for large CRDs** — kube-prometheus-stack and ArgoCD both ship CRDs that exceed the 262144-byte annotation limit of client-side apply. Both ArgoCD Application manifests and the Ansible bootstrap tasks use `--server-side` to avoid this.

**Single-node** — this is a homelab :)

**Operator scoped to what ArgoCD cannot do** — an earlier version created namespaces and ArgoCD `Application`s from a `HomelabApp` CRD. Both are native ArgoCD features (`CreateNamespace=true` and `ApplicationSet`), so that code was deleted. What remains is cloudflared route management, which has no off-the-shelf equivalent for a locally-managed tunnel. The operator is itself managed by ArgoCD, making it part of the GitOps flow.

**A rendered `deploy` branch per repo** — CI builds the image, writes the immutable SHA tag into the manifests, and force-pushes the result to a `deploy` branch that ArgoCD tracks. Pinning a digest rather than `:latest` is what makes ArgoCD notice a new build at all; publishing to a separate branch keeps `main` free of bot commits, so a clone is never left behind after a push. Same dry-source/hydrated-branch split as ArgoCD's own source hydrator.

**One repo per application** — application code and infrastructure have different lifecycles, reviewers and CI. Co-locating each app's manifests with its source means a change to both is one commit, and the ApplicationSet turns "new repo" into "new deployment" with no central registry to update.

## Secrets

No plaintext secrets are committed. Sensitive values are handled as follows:

| Secret | Where it lives |
|---|---|
| Cloudflare tunnel token | SealedSecret (encrypted, committed) |
| Grafana admin password | SealedSecret (encrypted, committed) |
| Sealed Secrets master key | Ansible Vault + Hetzner Object Storage |
| Hetzner API token | Local `terraform.tfvars` (gitignored) |
| S3 credentials | Ansible Vault (`group_vars/all/vault.yml`) |
