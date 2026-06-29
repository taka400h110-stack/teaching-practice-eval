import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        // 本番クライアントバンドルは minify する (esbuild)。
        // 以前は minify:false で index チャンクが 1.3MB あった。
        minify: 'esbuild',
        // チャンク分割で初期ロードを軽量化:
        //  - react 系 / MUI / recharts(重い) / tanstack を vendor 分離し
        //    ページ毎の lazy chunk から共有・キャッシュ効率を上げる。
        chunkSizeWarningLimit: 900,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'vendor-charts';
              if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
              if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-is') || id.includes('scheduler')) return 'vendor-react';
              if (id.includes('@tanstack')) return 'vendor-query';
              return 'vendor';
            },
          },
        },
      },
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
