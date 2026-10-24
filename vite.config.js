import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// High-performance manual chunk splitting for buttery smooth page loads
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
          }
        },
      },
    },
  },
})
