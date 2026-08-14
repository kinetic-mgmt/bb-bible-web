import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from a custom domain (app.sarahtalks.tv) via GitHub Pages, so base = '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
