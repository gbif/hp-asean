import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // Base path for GBIF Labs deployment (UserDir)
  base: '/~jwaller/country-metrics/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // Handle Figma asset imports
  define: {
    'figma:asset': 'undefined'
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})