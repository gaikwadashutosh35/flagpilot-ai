/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
// Unset/empty, or exactly a client key (no trimming); never print the value.
export function assertClientKey(key: string | undefined) {
  if (key && (key.startsWith('ser.') || !/^[A-Za-z0-9_-]{10,64}$/.test(key))) {
    throw new Error('VITE_FLAGSMITH_ENVIRONMENT_KEY must be a client environment key, not a server key or a malformed value')
  }
}

export default defineConfig(({ mode }) => {
  assertClientKey(loadEnv(mode, process.cwd(), 'VITE_').VITE_FLAGSMITH_ENVIRONMENT_KEY)
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': resolve(import.meta.dirname, './src') } },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['e2e/**', 'node_modules/**'],
    },
  }
})
