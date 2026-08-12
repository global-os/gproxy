import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.{ts,tsx}'],
    browser: {
      enabled: true,
      provider: 'playwright',
      name: 'firefox',
      headless: true,
    },
    testTimeout: 30_000,
  },
})
