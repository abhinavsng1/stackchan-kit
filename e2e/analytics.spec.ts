import { test, expect, type Page } from '@playwright/test'

const DIALOG = { name: 'Analytics choice' }

/** Mixpanel writes an mp_<token>_mixpanel key the moment it initialises. */
const initialised = (p: Page) =>
  p.evaluate(() => Object.keys(localStorage).some((k) => /^mp_/.test(k)))

/** Only real data endpoints count; dev chunk filenames contain "mixpanel" too. */
function watchApi(p: Page) {
  const hits: string[] = []
  p.on('request', (r) => { if (/\/\/api[^/]*\.mixpanel\.com/i.test(r.url())) hits.push(r.url()) })
  return hits
}

test('asks before recording anything', async ({ page }) => {
  const api = watchApi(page)
  await page.goto('/')
  await expect(page.getByRole('dialog', DIALOG)).toBeVisible()
  expect(await initialised(page), 'must not initialise while still asking').toBe(false)
  expect(api).toEqual([])
})

test('declining never initialises, and sticks', async ({ page }) => {
  const api = watchApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'No thanks' }).click()
  await expect(page.getByRole('dialog', DIALOG)).toBeHidden()

  await page.locator('#box').scrollIntoViewIfNeeded()
  await page.locator('#reserve').scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  expect(await initialised(page)).toBe(false)
  expect(api, 'nothing may reach Mixpanel').toEqual([])

  await page.reload()
  await expect(page.getByRole('dialog', DIALOG)).toBeHidden()
  expect(await initialised(page)).toBe(false)
})

test('accepting initialises, and sticks', async ({ page }) => {
  await page.route(/mixpanel\.com/i, (r) => r.fulfill({ status: 200, body: '1' }))
  await page.goto('/')
  await page.getByRole('button', { name: "That's fine" }).click()
  await expect.poll(() => initialised(page), { timeout: 8000 }).toBe(true)

  await page.reload()
  await expect(page.getByRole('dialog', DIALOG)).toBeHidden()
  await expect.poll(() => initialised(page), { timeout: 8000 }).toBe(true)
})

test('Global Privacy Control is treated as a refusal, unasked', async ({ page }) => {
  const api = watchApi(page)
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }))
  await page.goto('/')
  await page.waitForTimeout(900)
  await expect(page.getByRole('dialog', DIALOG)).toBeHidden()
  expect(await initialised(page)).toBe(false)
  expect(api).toEqual([])
})

test('the choice can be reopened from the footer', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'No thanks' }).click()
  await expect(page.getByRole('dialog', DIALOG)).toBeHidden()
  await page.getByRole('button', { name: 'Change your analytics choice' }).click()
  await expect(page.getByRole('dialog', DIALOG)).toBeVisible()
})

test('the banner does not fight the buy bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('dialog', DIALOG)).toBeVisible()
  await expect(page.locator('.buybar')).toBeHidden()
  await page.getByRole('button', { name: "That's fine" }).click()
  await page.locator('#box').scrollIntoViewIfNeeded()
  await expect(page.locator('.buybar')).toBeVisible()
})
