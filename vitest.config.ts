import { defineConfig } from 'vitest/config'
import path from 'path'

// Standalone Vitest config — the Vite config's Vue plugin isn't needed because
// the test suite targets pure composables, not .vue components. Using a
// separate file keeps the build config untouched.
export default defineConfig({
  test: {
    environment: 'happy-dom'
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src')
    }
  }
})
