# homelab

Personal Kubernetes homelab running on a single Hetzner VPS, built on GitOps principles. Every
component of the stack, from server provisioning to application deployment, is codified and
reproducible from a `terraform apply` and an `ansible-playbook` run.

Live at [homelab.carleid.dev](https://homelab.carleid.dev), [grafana.carleid.dev](https://grafana.carleid.dev).

## Contents

**The platform**

- [Stack](#stack)
- [Architecture](#architecture)
- [Repo structure](#repo-structure)
- [How the layers hand off](#how-the-layers-hand-off)
- [Adding an application](#adding-an-application)
- [homelab-operator](#homelab-operator)

**[Installation / Reproduction](#installation--reproduction)**

- [Requirements](#requirements)
- [1. Fork and rename](#1-fork-and-rename)
- [2. Create the Cloudflare tunnel](#2-create-the-cloudflare-tunnel)
- [3. Provision the server](#3-provision-the-server)
- [4. Point Ansible at it](#4-point-ansible-at-it)
- [5. Handle the Sealed Secrets master key](#5-handle-the-sealed-secrets-master-key)
- [6. Seal your secrets](#6-seal-your-secrets)
- [7. Bootstrap the root Application](#7-bootstrap-the-root-application)
- [8. Publish your applications](#8-publish-your-applications)
- [9. Verify](#9-verify)
- [Troubleshooting](#troubleshooting)

**Reference**

- [Day-to-day workflow](#day-to-day-workflow)
- [Design decisions](#design-decisions)
- [Secrets](#secrets)

## Stack

| Layer | Tool | Function |
|---|---|---|
| Infrastructure | [Terraform](https://developer.hashicorp.com/terraform) + [hcloud](https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs) | Hetzner VPS, firewall, SSH keys |
| Configuration | [Ansible](https://docs.ansible.com/) | [k3s](https://docs.k3s.io/) install, ArgoCD bootstrap, tooling |
| GitOps | [ArgoCD](https://argo-cd.readthedocs.io/) | Syncs the platform from this repo |
| Discovery | [ApplicationSet](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/) | Adopts any org repo carrying a `deploy/` directory and the `homelab-app` topic |
| Secrets | [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) ([Vault](https://developer.hashicorp.com/vault) planned) | Encrypted secrets, safe to commit |
| Ingress | [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) | Zero-trust exposure, no open inbound ports |
| Monitoring | [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) | [Prometheus](https://prometheus.io/), [Grafana](https://grafana.com/), Alertmanager |
| Operator | [homelab-operator](https://github.com/carleid-homelab/homelab-operator) (Go) | Publishes annotated Services through the tunnel |

## Architecture

```
Hetzner VPS
└── k3s
    ├── argocd              (watches this repo; ApplicationSet scans the org)
    ├── operator-system
    │   └── homelab-operator (custom Kubernetes operator, written in Go)
    ├── apps
    │   └── cloudflared     (outbound tunnel to Cloudflare)
    ├── homelab-web         (discovered from carleid-homelab/homelab-web)
    ├── homelab-api         (discovered from carleid-homelab/homelab-api)
    └── monitoring
        ├── prometheus
        ├── grafana
        └── alertmanager
```

Traffic flow: browser -> Cloudflare edge -> cloudflared tunnel -> cluster Service. The tunnel dials
out, so the firewall accepts no inbound HTTP at all. Ports 80 and 443 are closed on the server.

## Repo structure

This repo holds the platform. Applications live in their own repositories under the
[carleid-homelab](https://github.com/carleid-homelab) organisation.

```
carleid-homelab/homelab/    # this repo, platform only
├── terraform/              # Hetzner server + firewall
├── ansible/                # k3s + ArgoCD bootstrap playbook
└── k8s/
    ├── argocd/             # ArgoCD Applications + the ApplicationSet
    ├── platform/           # cloudflared, ArgoCD ServiceMonitor
    ├── monitoring/         # kube-prometheus-stack values + sealed secret
    └── namespaces/         # namespace definitions

carleid-homelab/            # one repo per application
├── homelab-web/            # React dashboard, source + deploy/
├── homelab-api/            # Go metrics proxy, source + deploy/
├── homelab-operator/       # the operator's Go source
└── homelab-app-template/   # starting point for new apps
```

## How the layers hand off

Terraform creates the server and the firewall. Ansible turns that bare server
into a cluster running ArgoCD, then applies `k8s/argocd/` once. From that point ArgoCD owns
everything: the `root` Application watches `k8s/argocd/` and manages the other Applications,
including itself (app of apps), so adding a platform component is a commit rather than a `kubectl apply`.

| Managed by | Coverage |
|---|---|
| Terraform | Server, firewall rules, SSH key |
| Ansible | k3s, Sealed Secrets controller and master key, ArgoCD, local tooling |
| ArgoCD | cloudflared, monitoring stack, the operator, every application |

## Adding an application

An `ApplicationSet` in `k8s/argocd/appset.yaml` scans the GitHub organisation and adopts every repo that carries both 
a `deploy/` directory and is tagged with the `homelab-app` topic:

```yaml
generators:
  - scmProvider:
      github:
        organization: carleid-homelab
      filters:
        - pathsExist: [deploy]
          labelMatch: homelab-app
```

Both conditions must pass, so a repo joins the cluster only when it is explicitly opted in.
Templates, experiments and this repo stay out without appearing in any exclusion list.

To add an application, use GitHub CLI to create a repo from the existing template:

```bash
gh repo create carleid-homelab/my-app --template carleid-homelab/homelab-app-template --public
gh repo edit carleid-homelab/my-app --add-topic homelab-app
```
To expose the app publicly, annotate its Service with the hostname:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  annotations:
    homelab.carleid.dev/domain: my-app.carleid.dev
```

Each app repo builds its own image in CI, writes the immutable tag into its manifests, and
publishes the result to a `deploy` branch. ArgoCD tracks the `deploy` branch, not main.

## homelab-operator

[carleid-homelab/homelab-operator](https://github.com/carleid-homelab/homelab-operator) is a
controller written in Go with
[controller-runtime](https://github.com/kubernetes-sigs/controller-runtime).

It watches Services carrying `homelab.carleid.dev/domain` and rebuilds the cloudflared ingress
list from them, then stamps a digest of the rendered config onto the tunnel's pod template so the
pods roll and read it. A locally-managed cloudflared only reads its config file at startup.

The image is published at `ghcr.io/carleid-homelab/homelab-operator` and deployed by ArgoCD from
that repo's `deploy` branch.

---

# Installation / Reproduction

The steps below recreate the same cluster from scratch on your own domain.

Only the server itself is tied to a cloud provider through `terraform/`. Everything
above it (k3s, ArgoCD, Sealed Secrets, the tunnel, monitoring, the operator) is plain Kubernetes
and does not know or care where it runs.

The Cloudflare Tunnel dials outward, so there is no LoadBalancer, no cloud ingress controller, no managed certificate, and no provider DNS
integration.

Caveats:

**Every SealedSecret in this repo is useless to the public.** Sealed Secrets encrypts against a master
key that lives inside the cluster, and the ciphertext is bound to a specific namespace and secret
name. The blobs committed here decrypt only in the original cluster. You will need to generate your own
key and re-seal every secret. Step 6 lists all of them.

**The playbook restores a master key it expects to already exist.** That is the disaster-recovery
path, and it is the reason a rebuild does not invalidate the secrets in Git.

## Requirements

### Tooling

On Linux, macOS, or WSL on Windows.

- [ ] **[Terraform](https://developer.hashicorp.com/terraform/install)** 1.5 or newer
- [ ] **[Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)** 2.15 or newer
- [ ] **[kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)**
- [ ] **[GitHub CLI](https://cli.github.com/)**, only for the app creation workflow in step 8
- [ ] An **SSH keypair**, `~/.ssh/id_ed25519` by default. [Generate one](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

`kubeseal` and `rclone` are not in this list. The playbook installs both on the server, which is
where you will use them.

### Accounts

- [ ] **A cloud provider account** with a VM with a public IP, plus whatever
      credential its Terraform provider needs. The committed configuration targets
      [Hetzner Cloud](https://www.hetzner.com/cloud/) and wants a read/write
      [API token](https://docs.hetzner.com/cloud/api/getting-started/generating-api-token/)
- [ ] **A [Cloudflare](https://dash.cloudflare.com/) account** with your domain's nameservers
      [pointed at Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [ ] **A GitHub organisation**: the ApplicationSet's
      [SCM Provider generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/)
      cannot scan a personal account (open issue)
- [ ] *Optional:* **an S3-compatible bucket** and its access keys, for off-cluster backup of the
      Sealed Secrets master key. Any S3 API works ([Hetzner Object Storage](https://docs.hetzner.com/storage/object-storage/overview/),
      AWS S3, [Backblaze B2](https://www.backblaze.com/cloud-storage), [Cloudflare R2](https://developers.cloudflare.com/r2/),
      [MinIO](https://min.io/))

## 1. Fork and rename

- [ ] Fork this repo into your organisation

```bash
gh repo fork carleid-homelab/homelab --org <your-org> --fork-name homelab --clone
cd homelab
```

- [ ] Replace the identifiers below

| Value | Where | Notes |
|---|---|---|
| `carleid-homelab` | `k8s/argocd/appset.yaml`, every `repoURL` in `k8s/argocd/`, `ansible/group_vars/all/vars.yml` | Your GitHub organisation |
| `carleid.dev` | `k8s/monitoring/grafana/values.yaml`, app Service annotations | Your domain |
| `homelab.carleid.dev/domain` | the annotation key itself | Optional. If you change it, change `DomainAnnotation` in the operator too |
| `hetzner_s3_*`, `homelab-carleid`, `nbg1` | `ansible/group_vars/all/vars.yml`, `ansible/templates/rclone.conf.j2` | Your bucket, region and endpoint. The rclone remote is already `provider = Other`, so any S3 API works by changing the endpoint |
| `carl` | `ansible/group_vars/all/vars.yml`, `terraform/variables.tf` | Admin user created by cloud-init |

A quick sweep to verify: 

```bash
grep -rn "carleid" --exclude-dir=.git .
```

## 2. Create the Cloudflare tunnel

- [ ] [Create a tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/)
      of type Cloudflared, in the dashboard under Zero Trust, Networks, Tunnels
- [ ] Copy its token and keep it for step 6
- [ ] Add the DNS records

| Option | Record | Trade-off |
|---|---|---|
| One per hostname | CNAME `app` to `<tunnel-id>.cfargotunnel.com`, proxied | Explicit, but a new record for every app you add |
| [Wildcard](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/) | CNAME `*` to `<tunnel-id>.cfargotunnel.com`, proxied | Set once, covers every future app. [Available on all plans](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/), and Universal SSL covers one subdomain level |

Without the wildcard, every new
public app also needs a DNS record.

## 3. Provision the server

- [ ] Provision a machine matching the requirements below

### Server requirements

| Requirement | Purpose |
|---|---|
| 4 vCPU, 8 GB RAM, 40 GB disk or better | k3s plus the full kube-prometheus-stack. |
| Ubuntu 22.04 or newer, x86_64 | Ansible playbook assumes this |
| A public IPv4 address | SSH access |
| [cloud-init](https://cloudinit.readthedocs.io/) support | How the admin user, SSH key and SSH hardening get applied on first boot. Every mainstream provider supports it |
| Inbound firewall: SSH only | Nothing else needed |
| Unrestricted outbound | The tunnel, image pulls and the k3s installer all egress |

*Note: In the current config, Prometheus is set to 15 days retention and Grafana takes a 5 Gi volume, both on the node's own filesystem through k3s `local-path`.*

### Hetzner-specific

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Fill in `hcloud_token` and `ssh_public_key_path`. Set `ssh_allowed_ip` to your own address in
CIDR form (`curl -4 ifconfig.co`, then append `/32`); it defaults to `0.0.0.0/0`, which works but
leaves SSH open to the internet.

```bash
terraform init
terraform apply
```

### On any other provider

Replace the contents of `terraform/` and keep `cloud-init.yaml`, which is standard cloud config. The three resources in `main.tf` are the
provider-specific part, and each has a direct equivalent everywhere:

| In `main.tf` | AWS | GCP | Azure |
|---|---|---|---|
| `hcloud_server` | `aws_instance` | `google_compute_instance` | `azurerm_linux_virtual_machine` |
| `hcloud_firewall` | `aws_security_group` | `google_compute_firewall` | `azurerm_network_security_group` |
| `hcloud_ssh_key` | `aws_key_pair` | (in instance metadata) | (in the VM resource) |
| `user_data` | `user_data` | `metadata_startup_script` | `custom_data`, base64 |

### Verification

`cloud-init` creates the admin user, installs your public key, moves SSH off port 22, and
disables password and root login.

```bash
ssh -p 2222 carl@<ip>
```

## 4. Ansible setup

- [ ] Put the server's IP in `inventory.yml`
- [ ] Point `repo_url` in `group_vars/all/vars.yml` at your fork

```yaml
all:
  hosts:
    homelab:
      ansible_host: <ip>
      ansible_port: 2222
      ansible_user: carl
```

- [ ] Create and encrypt the [Ansible Vault](https://docs.ansible.com/ansible/latest/vault_guide/index.html)
- [ ] Store the vault password someplace of your choice

```bash
cd ../ansible
```

### rclone (optional)

Create the vault, which holds the S3 credentials used to template `rclone.conf`:

```bash
cp vault.yml.example group_vars/all/vault.yml
# edit in your S3 access key and secret
ansible-vault encrypt group_vars/all/vault.yml
```

The variables are named `hetzner_s3_*` but nothing about them is Hetzner-specific. The rclone
remote is declared as `provider = Other`.

## 5. Handle the Sealed Secrets master key

| Situation | Steps |
|---|---|
| **First install.** No key exists yet | Work through 5.1 to 5.6 below |
| **Rebuilding.** The key is already encrypted in `ansible/files/` | Run `ansible-playbook site.yml --ask-vault-pass` and skip to [step 6](#6-seal-your-secrets) |

### First install

- [ ] **5.1 Disable the restore tasks.** Comment out all three tasks under
  `# 5. Sealed secrets` in `ansible/site.yml`:

  ```yaml
  # - name: Stage the Sealed Secrets master key on the host
  # - name: Restore the master key into kube-system
  # - name: Wipe the staged key file
  ```

- [ ] **5.2 Run the playbook.** The controller installs with no key present, so it generates one.

  ```bash
  ansible-playbook site.yml --ask-vault-pass
  ```

  This installs k3s, creates the namespaces, installs Sealed Secrets and ArgoCD, waits for the
  CRDs and rollouts, clones your fork to `/opt/homelab`, and applies `k8s/argocd/`. The
  Applications will sit unhealthy until you seal the secrets in step 6.

- [ ] **5.3 Export the generated key.** Run this **on the server**:

  ```bash
  kubectl get secret -n kube-system \
    -l sealedsecrets.bitnami.com/sealed-secrets-key \
    -o yaml > sealed-secrets-key.yaml
  ```

- [ ] **5.4 Back it up off-cluster, while it is still plaintext.** Stage 9 of the playbook already
  configured `rclone` on the server:

  ```bash
  rclone copy sealed-secrets-key.yaml <remote>:<your-bucket>/
  ```

- [ ] **5.5 Bring it back to your workstation and encrypt it.**

  ```bash
  scp -P 2222 carl@<ip>:sealed-secrets-key.yaml ansible/files/
  ansible-vault encrypt ansible/files/sealed-secrets-key.yaml
  ```

  Use the same vault password as `group_vars/all/vault.yml`. Once encrypted, it is safe to commit.

  Then delete the plaintext copy left on the server:

  ```bash
  ssh -p 2222 carl@<ip> "rm sealed-secrets-key.yaml"
  ```

- [ ] **5.6 Point the restore task at your key, then re-enable it.** The guard checks for one
  specific secret name and yours will differ. Read the real name:

  ```bash
  ansible-vault view ansible/files/sealed-secrets-key.yaml | grep "name: sealed-secrets-key"
  ```

  Uncomment the three tasks from 5.1 and substitute that name in `ansible/site.yml`:

  ```yaml
  - name: Restore the master key into kube-system
    ansible.builtin.shell: |
      kubectl get secret sealed-secrets-keyXXXXX -n kube-system >/dev/null 2>&1 \
      || kubectl apply -f /tmp/sealed-secrets-key.yaml
  ```

  Re-run the playbook to confirm it is idempotent. It should report no changes for stage 5,
  because the key it would restore is the one already there.

  ```bash
  ansible-playbook site.yml --ask-vault-pass
  ```

Commit `ansible/files/sealed-secrets-key.yaml` and `ansible/site.yml` once this passes.

> [!WARNING]
> This key is the single irreplaceable item in the whole stack. Everything else can be rebuilt
> from Git. Without it, every committed SealedSecret is permanently unreadable, and you would have
> to re-mint every credential from scratch. It is protected by your Ansible Vault password, so
> losing that password loses the key with it.

## 6. Seal your secrets

- [ ] Cloudflare tunnel token, into `apps`
- [ ] Grafana admin login, into `monitoring`
- [ ] GitHub PAT for repo discovery, into `argocd`
- [ ] Grafana service account token, into `homelab-api` (in that repo)
- [ ] Commit and push all four

[`kubeseal`](https://github.com/bitnami-labs/sealed-secrets#kubeseal) was installed on the VPS by
stage 9 of the playbook. All four commands run there, and each writes a manifest you commit to Git.
None of them puts a plaintext value on disk.

**Cloudflare tunnel token**

```bash
kubectl create secret generic cloudflared-credentials \
  --from-literal=token=<tunnel-token> -n apps \
  --dry-run=client -o yaml | kubeseal -o yaml > k8s/platform/cloudflared/sealed-secret.yaml
```

**Grafana admin login**

```bash
kubectl create secret generic grafana-admin-credentials \
  --from-literal=admin-user=admin \
  --from-literal=admin-password=<password> -n monitoring \
  --dry-run=client -o yaml | kubeseal -o yaml > k8s/monitoring/grafana/sealed-secret.yaml
```

**GitHub token for repo discovery.** Mint a
[fine-grained PAT](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
scoped to your organisation with `Contents: read` and `Metadata: read`.

```bash
kubectl create secret generic github-scm-token \
  --from-literal=token=<pat> -n argocd \
  --dry-run=client -o yaml | kubeseal -o yaml > k8s/argocd/github-scm-token.yaml
```

**Per-application secrets** live in their own repos. `homelab-api` needs a Grafana service
account token, created under Administration, Users and access, Service accounts, with the Viewer
role:

```bash
kubectl create secret generic homelab-api-secrets \
  --from-literal=grafana-token=<token> -n homelab-api \
  --dry-run=client -o yaml | kubeseal -o yaml > deploy/sealed-secret.yaml
```

Commit and push each of these. ArgoCD picks them up within about three minutes.

## 7. Bootstrap the root Application

The playbook already ran `kubectl apply -f /opt/homelab/k8s/argocd/`, which includes
`root-app.yaml`. If you are starting from a cluster that skipped that step, apply it once by
hand:

```bash
kubectl apply -f k8s/argocd/root-app.yaml
```

`root` watches `k8s/argocd/` and manages every other Application, including itself. This is the
only manual `kubectl apply` in the entire system.

## 8. Publish your applications

- [ ] Create a repo from the [template](https://github.com/carleid-homelab/homelab-app-template)
- [ ] Tag it with the `homelab-app` topic
- [ ] After the first CI run, make the GHCR package public

The ApplicationSet finds nothing until at least one repo in the org qualifies. Create one from
the template:

```bash
gh repo create <org>/my-app --template <org>/homelab-app-template --public
gh repo edit <org>/my-app --add-topic homelab-app
```

> [!IMPORTANT]
> With the current config, **the packages have to be set to public.** Nothing in `deploy/` declares
> an `imagePullSecrets`, and the cluster holds no registry credentials, so the kubelet pulls
> anonymously.

## 9. Verify

- [ ] Every Application is Synced and Healthy

```bash
kubectl get applications -n argocd
```

- [ ] The ApplicationSet generated one Application per tagged repo
- [ ] The cloudflared ConfigMap holds real routes, not just the catch-all

```bash
kubectl get applicationset -n argocd homelab-apps -o yaml   # generator found your repos
kubectl get cm cloudflared -n apps -o jsonpath='{.data.config\.yaml}'
```

The ConfigMap should list one rule per annotated Service, sorted by hostname, with
`service: http_status:404` last. If it holds only the catch-all, the operator has not reconciled;
check `kubectl logs -n operator-system deploy/operator-controller-manager`.

- [ ] Your hostnames answer over HTTPS

## Common troubleshooting

**Applications never appear.** The generator needs both the `deploy/` directory and the
`homelab-app` topic. Topics are not copied from templates, so this is usually a missing topic.

**`ImagePullBackOff`.** The GHCR package may be set to private.

**cloudflared serves 404 for everything.** Normal on a cold bootstrap: the committed ConfigMap
holds only the catch-all, and the operator fills in the rest on its first reconcile. If it
persists, the operator is not running or the Services are not annotated.

**Pods evicted, or Prometheus restarting.** Undersized VM. Check `kubectl top
nodes`.

---

## Day-to-day workflow

Changes to the cluster are made by editing manifests and pushing to `main`. ArgoCD detects the
change and reconciles within about three minutes.

```
edit manifest → git push → ArgoCD syncs → cluster updated
```

Application changes are pushed to their own repositories, where CI builds the image and ArgoCD
picks up the result. This repo only changes when the platform itself does.

`kubectl` is used for debugging and inspection, not for changing things.