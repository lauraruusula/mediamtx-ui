import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Auto-register Element Plus components (and the v-loading directive)
    // used in templates, so only the components this app actually uses are
    // bundled instead of the full library. Styles still come from the single
    // `element-plus/dist/index.css` import in main.ts (importStyle: false),
    // which keeps the global style order our design system depends on.
    Components({
      directives: true,
      dts: false,
      resolvers: [ElementPlusResolver({ importStyle: false })]
    })
  ],
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
  build: {
    rolldownOptions: {
      output: {
        // Split the entry chunk (Element Plus + ECharts + core vendors are all
        // statically imported by main.ts) into stable vendor chunks so they
        // load in parallel and keep their cache hashes when app code changes.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('element-plus') || id.includes('@element-plus/icons-vue'))
            return 'element-plus'
          if (id.includes('/echarts/') || id.includes('/zrender/') || id.includes('/vue-echarts/'))
            return 'echarts'
          if (
            id.includes('/vue/') ||
            id.includes('/@vue/') ||
            id.includes('/vue-router/') ||
            id.includes('/pinia/') ||
            id.includes('/@vueuse/') ||
            id.includes('/axios/') ||
            id.includes('/dayjs/')
          )
            return 'vue-vendor'
          return 'misc-vendor'
        }
      }
    },
    // The tree-shaken echarts chunk (~630 kB, ECharts core + the three chart
    // types) stays above the default 500 kB warning threshold, so raise it.
    chunkSizeWarningLimit: 800
  },
  server: {
    host: true,
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:9997',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
})
