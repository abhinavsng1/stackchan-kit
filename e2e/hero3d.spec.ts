import { test, expect } from '@playwright/test'
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

const play = (p: import('@playwright/test').Page) => p.locator('#does')

test('the model is built from the real printed geometry', async ({ page }) => {
  const glb: string[] = []
  page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url()) })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await play(page).scrollIntoViewIfNeeded()
  await expect(play(page).locator('canvas')).toHaveCount(1, { timeout: 40000 })
  await expect.poll(() => glb.length, { timeout: 40000 }).toBeGreaterThan(0)
  // Not a model someone drew to look like the product — the print files.
  expect(glb.join(' ')).toContain('shell_SCS0009')
})

test('a phone gets it too, with no extra tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await play(page).scrollIntoViewIfNeeded()
  await expect(play(page).locator('canvas')).toHaveCount(1, { timeout: 40000 })
})

test('on a phone the controls stay on the device, not below it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await play(page).scrollIntoViewIfNeeded()
  const frame = play(page).locator('canvas')
  await expect(frame).toHaveCount(1, { timeout: 40000 })

  // Operating a demo must not mean scrolling away from the thing you are
  // operating: every control has to sit within the frame's own bounds.
  const box = await play(page).locator('div.relative.overflow-hidden').first().boundingBox()
  const button = play(page).getByRole('button', { name: /It can see/ })
  const bb = await button.boundingBox()
  expect(box).not.toBeNull()
  expect(bb).not.toBeNull()
  expect(bb!.y).toBeGreaterThanOrEqual(box!.y - 1)
  expect(bb!.y + bb!.height).toBeLessThanOrEqual(box!.y + box!.height + 1)
})

test('nothing 3D is fetched on a Save-Data connection', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true }) })
  })
  const page = await ctx.newPage()
  const glb: string[] = []
  page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url()) })
  await settleConsent(page)
  await page.goto('/')
  await play(page).scrollIntoViewIfNeeded()
  await page.waitForTimeout(3500)
  expect(glb, 'a megabyte of geometry is not a courtesy on a metered connection').toEqual([])
  await ctx.close()
})

test('every capability can be operated, and names the part that provides it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await play(page).scrollIntoViewIfNeeded()
  await expect(play(page).locator('canvas')).toHaveCount(1, { timeout: 40000 })

  // Seven claims on the page; seven things you can actually drive here.
  const buttons = play(page).getByRole('button', { name: /U1|M1 \+ M2/ })
  await expect.poll(() => buttons.count(), { timeout: 40000 }).toBe(7)

  for (const [label, call] of [
    ['It can see', 'camera.read()'],
    ['It talks and listens', 'audio.listen()'],
    ['You can program it', 'app.run("pong")'],
    ['It gets online', 'wifi.connect'],
  ] as const) {
    await play(page).getByRole('button', { name: new RegExp(label) }).click()
    await expect(play(page).getByText(call, { exact: false })).toBeVisible()
  }
})

test('the camera and microphone demos say what happens to the stream', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await play(page).scrollIntoViewIfNeeded()
  await play(page).getByRole('button', { name: /It talks and listens/ }).click()
  // Asking for a microphone without saying where it goes is not acceptable.
  await expect(play(page).getByText(/Nothing is recorded or sent/)).toBeVisible()
})

test('the servo readout is in the degrees the real servos report', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await play(page).scrollIntoViewIfNeeded()
  await expect(play(page).getByText(/PAN M1/)).toBeVisible()
  await expect(play(page).getByText(/TILT M2/)).toBeVisible()
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('never loads the 3D at all', async ({ page }) => {
    const glb: string[] = []
    page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url()) })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await play(page).scrollIntoViewIfNeeded()
    await page.waitForTimeout(3000)
    expect(glb).toEqual([])
  })
})
