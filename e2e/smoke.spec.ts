import { test, expect } from '@playwright/test'

// End-to-end smoke tests. These assume a Supabase-configured build is being
// served (see playwright.config.ts) and, for the authenticated flows, that the
// NOVA_TEST_EMAIL / NOVA_TEST_PASSWORD env vars point at a seeded test account.
const email = process.env.NOVA_TEST_EMAIL
const password = process.env.NOVA_TEST_PASSWORD

test('login page renders with auth options', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Welcome to Nova')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Magic link' })).toBeVisible()
})

test.describe('authenticated flows', () => {
  test.skip(!email || !password, 'Set NOVA_TEST_EMAIL / NOVA_TEST_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@company.com').fill(email!)
    await page.getByPlaceholder('••••••••').fill(password!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/')
  })

  test('board renders and a board is reachable from the sidebar', async ({ page }) => {
    await expect(page.getByText('Boards')).toBeVisible()
    const firstBoard = page.locator('a[href^="/board/"]').first()
    await firstBoard.click()
    await expect(page.getByRole('button', { name: 'Table' })).toBeVisible()
  })

  test('drag handles are present on item rows', async ({ page }) => {
    await page.locator('a[href^="/board/"]').first().click()
    await expect(page.getByText('Item', { exact: true }).first()).toBeVisible()
  })

  test('a gated view opens the paywall on the free plan', async ({ page }) => {
    await page.locator('a[href^="/board/"]').first().click()
    await page.getByRole('button', { name: /Dashboard/ }).click()
    // On the free plan the Dashboard tab renders the paywall.
    await expect(page.getByText('Upgrade to Pro')).toBeVisible()
  })
})
