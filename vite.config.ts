import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from the custom domain root (clearparcel.io), not a GitHub
  // Pages project subpath.
  base: '/',
  plugins: [react(), tailwindcss()],
})
