variable "hcloud_token" {
  description = "Hetzner Cloud API token (project-scoped)."
  type        = string
  sensitive   = true
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key uploaded to the server."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_allowed_ip" {
  description = "Your IP in CIDR form, allowed to SSH in. Use 0.0.0.0/0 to allow any (less secure)."
  type        = string
  default     = "0.0.0.0/0"
}

variable "server_name" {
  description = "Name of the server. Use a different name (e.g. homelab-test) to stand up a throwaway box for rebuild testing."
  type        = string
  default     = "homelab"
}

variable "server_type" {
  description = "Hetzner server type."
  type        = string
  default     = "cx33" # 4 vCPU / 8 GB / 80 GB
}

variable "server_image" {
  description = "OS image."
  type        = string
  default     = "ubuntu-24.04"
}

variable "location" {
  description = "Hetzner location. nbg1 = Nuremberg (matches the bucket)."
  type        = string
  default     = "nbg1"
}

variable "ssh_port" {
  description = "SSH port the server will listen on after cloud-init."
  type        = number
  default     = 2222
}

variable "admin_user" {
  description = "Non-root admin user created by cloud-init."
  type        = string
  default     = "carl"
}
