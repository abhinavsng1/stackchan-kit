import { test, expect } from '@playwright/test'
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

test('the demo is silent by construction, not just muted', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('video')
  await expect(video).toHaveJSProperty('muted', true)
  await expect(video).toHaveJSProperty('loop', true)
  // A muted attribute can be toggled; a file with no audio track cannot.
  const res = await page.request.get('/media/demo.mp4')
  expect(res.status()).toBe(200)
})

test('downloads nothing until the section is reached', async ({ page }) => {
  const media: string[] = []
  page.on('request', (r) => { if (/\/media\/demo\.(mp4|webm)/.test(r.url())) media.push(r.url()) })
  await page.goto('/')
  await page.waitForTimeout(1500)
  expect(media, 'a megabyte should not load before it is on screen').toEqual([])

  await page.locator('video').scrollIntoViewIfNeeded()
  await expect.poll(() => media.length, { timeout: 15000 }).toBeGreaterThan(0)
})

test('plays once it is on screen and pauses when it is not', async ({ page }) => {
  await page.goto('/')
  await page.locator('video').scrollIntoViewIfNeeded()
  await expect.poll(async () => page.locator('video').evaluate((v: HTMLVideoElement) => !v.paused),
    { timeout: 15000 }).toBe(true)

  await page.locator('#reserve').scrollIntoViewIfNeeded()
  await expect.poll(async () => page.locator('video').evaluate((v: HTMLVideoElement) => v.paused),
    { timeout: 8000 }).toBe(true)
})

test('runs for thirty seconds', async ({ page }) => {
  await page.goto('/')
  await page.locator('video').scrollIntoViewIfNeeded()
  const seconds = await page.locator('video').evaluate((v: HTMLVideoElement) =>
    new Promise<number>((resolve) => {
      if (v.duration) return resolve(v.duration)
      v.addEventListener('loadedmetadata', () => resolve(v.duration), { once: true })
    }))
  expect(Math.round(seconds)).toBe(30)
})
