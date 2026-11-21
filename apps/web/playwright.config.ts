import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5180' },
  webServer: {
    command: 'npm run dev -- --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: false,
    // Empty key keeps Flagsmith off: no network traffic in E2E.
    env: { VITE_FLAGSMITH_ENVIRONMENT_KEY: '' },
  },
})
