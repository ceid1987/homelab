# ============================================================================
# Hetzner infrastructure for the homelab.
#
# Provisions server and firewall 
# 
# ============================================================================

resource "hcloud_ssh_key" "admin" {
  name       = "${var.server_name}-admin"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

resource "hcloud_firewall" "main" {
  name = "${var.server_name}-fw"

  # Inbound
  # Only SSH. cloudflared is an outbound tunnel, so apps need NO inbound rules.
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = tostring(var.ssh_port)
    source_ips = [var.ssh_allowed_ip]
  }

  # Outbound
  rule {
    direction       = "out"
    protocol        = "tcp"
    port            = "443" # HTTPS: image pulls, git, Cloudflare API, Hetzner S3
    destination_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction       = "out"
    protocol        = "tcp"
    port            = "80" # HTTP: apt / some package mirrors
    destination_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction       = "out"
    protocol        = "udp"
    port            = "123" # NTP 
    destination_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction       = "out"
    protocol        = "udp"
    port            = "7844" # cloudflared tunnel
    destination_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction       = "out"
    protocol        = "tcp"
    port            = "7844" # cloudflared TCP
    destination_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server" "node" {
  name        = var.server_name
  server_type = var.server_type
  image       = var.server_image
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.admin.id]
  firewall_ids = [hcloud_firewall.main.id]

  # cloud-init: create the admin user, set the SSH port, harden login.
  user_data = templatefile("${path.module}/cloud-init.yaml", {
    admin_user = var.admin_user
    ssh_port   = var.ssh_port
    ssh_pubkey = file(pathexpand(var.ssh_public_key_path))
  })

  labels = {
    project = "homelab"
  }
}
