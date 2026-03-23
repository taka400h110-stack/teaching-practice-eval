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

  return {
    plugins: [pages()],
    build: { emptyOutDir: false, minify: false }
  }
})
