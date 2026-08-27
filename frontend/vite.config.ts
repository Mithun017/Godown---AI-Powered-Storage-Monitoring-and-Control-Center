import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Amendment #1: Proxy /api requests to FastAPI backend on port 8000 for same-origin cookies
// allowedHosts: true allows Cloudflare Tunnels (*.trycloudflare.com) & local WiFi IP sharing
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    allowedHosts: true,
  },
});
