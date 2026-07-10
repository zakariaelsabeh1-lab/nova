import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('@dnd-kit')) return 'dnd'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('react-router') || id.includes('react-dom')) return 'react'
          }
          return undefined
        },
      },
    },
  },
})
