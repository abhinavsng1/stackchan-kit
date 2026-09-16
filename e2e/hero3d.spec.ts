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


test('the hero shows a photograph of a real unit, not only a render', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  // The hidden half of the pair is aria-hidden, so it is deliberately absent
  // from the accessibility tree. Match the element itself instead.
  const photo = page.locator('img[src*="unit"]')
  await expect(photo).toBeAttached()
  await expect(photo).toHaveAttribute('alt', /assembled Pebble-chan/i)
})

test('the photograph is what a visitor without WebGL gets', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(() => {
    // Deny every WebGL context, as an older or locked-down browser would.
    const get = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      if (/webgl/i.test(type)) return null
      // @ts-expect-error passthrough for every other context type
      return get.call(this, type, ...rest)
    }
  })
  const page = await ctx.newPage()
  const glb: string[] = []
  page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url()) })
  await page.goto('/')
  await page.waitForTimeout(2000)

  await expect(page.getByRole('img', { name: /assembled Pebble-chan/i })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(glb, 'no model bytes when there is nothing to render them with').toEqual([])
  await ctx.close()
})

test('the hero switcher shows which view is up and swaps on click', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 20000 })

  const model = page.getByRole('button', { name: /Show the 3D model/ })
  const photo = page.getByRole('button', { name: /Show a photo/ })
  await expect(model).toBeVisible()
  await expect(photo).toBeVisible()

  // The model leads, so its dot is the pressed one.
  await expect(model).toHaveAttribute('aria-pressed', 'true')
  await expect(photo).toHaveAttribute('aria-pressed', 'false')

  // Either dot jumps straight there rather than waiting out the hold.
  await photo.click()
  await expect(photo).toHaveAttribute('aria-pressed', 'true')
  await expect(model).toHaveAttribute('aria-pressed', 'false')

  await model.click()
  await expect(model).toHaveAttribute('aria-pressed', 'true')
})

test('the hero alternates on its own about every ten seconds', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 20000 })

  const photo = page.getByRole('button', { name: /Show a photo/ })
  await expect(photo).toHaveAttribute('aria-pressed', 'false')
  // Well inside 30s, which is what the hold used to be.
  await expect(photo).toHaveAttribute('aria-pressed', 'true', { timeout: 16000 })
})
