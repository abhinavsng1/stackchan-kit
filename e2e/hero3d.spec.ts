import { test, expect } from '@playwright/test'
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

test('desktop gets the 3D model', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 15000 })
})

test('the model is built from the real printed geometry', async ({ page }) => {
  const glb: string[] = []
  page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url()) })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect.poll(() => glb.length, { timeout: 15000 }).toBeGreaterThan(0)
  expect(glb.join(' ')).toContain('shell_SCS0009')
})

test('a phone gets the model too, with no extra tap', async ({ page }) => {
  const glb: string[] = []
  page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url()) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 20000 })
  await expect.poll(() => glb.length, { timeout: 20000 }).toBeGreaterThan(0)
  // The opt-in button is gone; nothing should be asking permission any more.
  await expect(page.getByRole('button', { name: /View the 3D model/ })).toHaveCount(0)
})

test('Save-Data is still honoured, on a phone as much as anywhere', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true }) })
    try { localStorage.setItem('sc-analytics-consent', 'denied') } catch {}
  })
  const page = await ctx.newPage()
  const glb: string[] = []
  page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url()) })
  await page.goto('/')
  await page.waitForTimeout(2500)
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(glb, 'a visitor asking to save data pays nothing').toEqual([])
  await ctx.close()
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })

  test('never loads the 3D at all', async ({ page }) => {
    const heavy: string[] = []
    page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) heavy.push(r.url()) })
    await page.goto('/')
    await page.waitForTimeout(1500)
    await expect(page.locator('canvas')).toHaveCount(0)
    expect(heavy, 'a visitor who asked for less motion pays nothing').toEqual([])
  })
})

