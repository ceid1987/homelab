output "server_ip" {
  description = "Public IPv4 of the server. Drop this into the Ansible inventory."
  value       = hcloud_server.node.ipv4_address
}

output "server_name" {
  value = hcloud_server.node.name
}

output "ssh_command" {
  description = "Ready-to-use SSH command."
  value       = "ssh ${var.admin_user}@${hcloud_server.node.ipv4_address} -p ${var.ssh_port}"
}
