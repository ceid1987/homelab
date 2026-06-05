# ============================================================================
# Template for sealed-secrets-key.yaml
#   # 1. Export the live master key from the running cluster
#   kubectl get secret -n kube-system \
#     -l sealedsecrets.bitnami.com/sealed-secrets-key \
#     -o yaml > sealed-secrets-key.yaml
#
#   # 2. Move it into this folder
#   mv sealed-secrets-key.yaml ansible/files/sealed-secrets-key.yaml
#
#   # 3. Encrypt it in place (same vault password as group_vars/all/vault.yml)
#   ansible-vault encrypt ansible/files/sealed-secrets-key.yaml
#
# Once encrypted it is safe to commit. The playbook's `copy` task decrypts it
# in flight and applies it to kube-system BEFORE the controller installs, so
# the controller adopts this key and every SealedSecret in Git stays valid.
#
# You ALSO keep a copy of this key in your Hetzner bucket as a second backup:
#   rclone copy sealed-secrets-key.yaml hetzner:homelab-carleid/
# (export the plaintext for that, then delete the local plaintext copy.)
# ============================================================================
