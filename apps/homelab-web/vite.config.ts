import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the homelab-api proxy (reached via the SSH tunnel
    // + kubectl port-forward on localhost:8080 in dev).
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
