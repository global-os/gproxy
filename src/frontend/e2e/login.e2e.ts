import { test, expect } from 'vitest'
import { page } from '@vitest/browser/context'

const BASE = 'https://app.app.dev.onetrueos.com:3443'

test('login page loads', async () => {
  await page.goto(`${BASE}/login`)
  await expect.element(page.locator('#email')).toBeVisible()
  await expect.element(page.locator('#password')).toBeVisible()
})

test('login with valid credentials', async () => {
  await page.goto(`${BASE}/login`)
  await page.locator('#email').fill('peterson@sent.com')
  await page.locator('#password').fill('Nargism333')
  await page.locator('button[type="submit"]').click()
  await expect.element(page.locator('text=My Global PC')).toBeVisible({ timeout: 10_000 })
})
