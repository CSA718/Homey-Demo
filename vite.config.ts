import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Temporary: back to the GitHub Pages project-subpath until
  // clearparcel.io is registered and DNS is live. Revert to base: '/'
  // (plus public/CNAME and 404.html's pathSegmentsToKeep) once it is.
  base: '/Homey-Demo/',
  plugins: [react(), tailwindcss()],
})
