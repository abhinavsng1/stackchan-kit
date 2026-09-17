import { test, expect } from '@playwright/test'
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

test('every section anchor the nav points at exists', async ({ page }) => {
  await page.goto('/')
  const hrefs = await page.locator('header nav a').evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!))
  expect(hrefs.length).toBeGreaterThan(0)
  for (const href of hrefs) {
    await expect(page.locator(href), `${href} should exist`).toHaveCount(1)
  }
})

test('the robot tracks the pointer', async ({ page }) => {
  test.skip(true, 'needs WebGL; covered in the webgl project by hero3d.spec.ts')
  await page.goto('/')
  const readout = page.locator('figcaption span').filter({ hasText: '°' }).first()
  await page.mouse.move(100, 400)
  await page.waitForTimeout(900)
  const left = await readout.textContent()
  await page.mouse.move(1200, 400)
  await page.waitForTimeout(900)
  const right = await readout.textContent()
  expect(left).not.toBe(right)
})

test('no horizontal scroll at phone, tablet and desktop widths', async ({ page }) => {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `overflow at ${width}px`).toBe(0)
  }
})
