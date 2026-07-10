import { defineConfig, devices } from '@playwright/test'

// Smoke tests run against a locally served build. Set NOVA_BASE_URL to target a
// deployed instance instead. Requires a Supabase-configured .env so the app boots.
const baseURL = process.env.NOVA_BASE_URL ?? 'http://localhost:4173'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Use the environment's preinstalled Chromium when present.
    launchOptions: process.env.PLAYWRIGHT_BROWSERS_PATH
      ? { executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` }
      : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.NOVA_BASE_URL
    ? undefined
    : { command: 'npm run preview', url: baseURL, reuseExistingServer: true, timeout: 60_000 },
})
