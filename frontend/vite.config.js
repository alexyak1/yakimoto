import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Make environment variables available in HTML
    '__VITE_GA_MEASUREMENT_ID__': JSON.stringify(process.env.VITE_GA_MEASUREMENT_ID || '')
  }
})
