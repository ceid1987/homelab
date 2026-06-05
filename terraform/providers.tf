terraform {
  required_version = ">= 1.6"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }

  # Remote state in the Hetzner bucket. Hetzner Object Storage is S3-compatible,
  # so the standard S3 backend works with a few skip_* flags.
  # Uncomment after the bucket + credentials exist (see README).
  #
  # backend "s3" {
  #   bucket                      = "homelab-carleid"
  #   key                         = "terraform/homelab.tfstate"
  #   region                      = "nbg1"
  #   endpoints                   = { s3 = "https://nbg1.your-objectstorage.com" }
  #   skip_credentials_validation = true
  #   skip_region_validation      = true
  #   skip_requesting_account_id  = true
  #   skip_s3_checksum            = true
  #   use_path_style              = true
  # }
}

provider "hcloud" {
  token = var.hcloud_token
}
