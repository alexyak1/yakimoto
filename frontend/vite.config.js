import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Make environment variables available in HTML
    'import.meta.env.VITE_GA_MEASUREMENT_ID': JSON.stringify(process.env.VITE_GA_MEASUREMENT_ID || ''),
    '__VITE_GOOGLE_ADS_ID__': JSON.stringify(process.env.VITE_GOOGLE_ADS_ID || '')
  }
})
