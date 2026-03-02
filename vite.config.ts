import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // React 19との互換性のため重複パッケージを統一
    dedupe: ['react', 'react-dom', 'react-is'],
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 3000,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('@emotion') || id.includes('@mui/material')) {
            return 'mui-core';
          }
          if (id.includes('@mui/icons-material')) {
            return 'mui-icons';
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'chart-vendor';
          }
          if (id.includes('@tanstack')) {
            return 'query-vendor';
          }
        },
      },
    },
  },
})
