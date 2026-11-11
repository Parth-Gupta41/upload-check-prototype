import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' makes the build work on GitHub Pages under any repo name.
export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never)
