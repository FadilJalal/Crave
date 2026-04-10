import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          maps: ['leaflet', 'react-leaflet', 'open-location-code'],
          vendor: ['axios', 'react-toastify'],
        },
      },
    },
  },
  server: {
    port: 5174,
  },
})
