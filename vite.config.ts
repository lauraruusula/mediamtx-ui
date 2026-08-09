import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    // Admin UI's own version (distinct from the MediaMTX server version shown
    // in the header pill), surfaced in the sidebar footer.
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src')
    }
  },
  server: {
    host: true,
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:9997',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
      '/webrtc': {
        target: 'http://localhost:8889',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/webrtc/, '')
      }
    }
  }
})
