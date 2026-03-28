import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      plugins: [react()],
      build: { outDir: 'dist', emptyOutDir: false, minify: false, rollupOptions: {} },
      resolve: { dedupe: ['react', 'react-dom', 'react-is'] }
    }
  }

  // Use custom build for worker to support `scheduled` handler without being wrapped by pages()
  return {
    build: { 
      ssr: 'src/worker.ts',
      emptyOutDir: false, 
      minify: false,
      rollupOptions: {
        output: {
          entryFileNames: '_worker.js'
        }
      }
    }
  }
})
