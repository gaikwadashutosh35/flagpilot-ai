/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Fail the build if a server key was put in the client env (never print the value).
  if (loadEnv(mode, process.cwd(), 'VITE_').VITE_FLAGSMITH_ENVIRONMENT_KEY?.startsWith('ser.')) {
    throw new Error('VITE_FLAGSMITH_ENVIRONMENT_KEY must be a client key, not a server key')
  }
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
