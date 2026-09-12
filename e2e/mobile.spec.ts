import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['iPhone 13'] })
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

test('navigation is reachable on a phone', async ({ page }) => {
  await page.goto('/')
  const links = page.locator('.navstrip a')
  // the desktop nav is hidden below lg, so the strip is what must carry them
  await expect(links.filter({ hasText: 'In the box' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Reserve', exact: true }).or(
    page.getByRole('link', { name: 'Reserve a kit' })).first()).toBeVisible()
})

test('buy bar appears after the hero and retreats over the form', async ({ page }) => {
  await page.goto('/')
  const bar = page.locator('.buybar')

  await expect(bar).toHaveAttribute('data-show', 'false')

  await page.locator('#box').scrollIntoViewIfNeeded()
  await expect(bar).toHaveAttribute('data-show', 'true')

  // it must not cover the form it points at
  await page.locator('#reserve').scrollIntoViewIfNeeded()
  await expect(bar).toHaveAttribute('data-show', 'false')
})

test('buy bar appears after a nav-link jump, not just a smooth scroll', async ({ page }) => {
  // Regression: IntersectionObserver never fired for a jump that skipped past
  // the hero CTA without it ever being visible, so the bar stayed hidden.
  await page.goto('/')
  await page.locator('.navstrip a', { hasText: 'Specs' }).click()
  await expect(page.locator('.buybar')).toHaveAttribute('data-show', 'true')
})

test('capability tiles are a swipe rail, not a vertical pile', async ({ page }) => {
  await page.goto('/')
  const rail = page.locator('.rail')
  const box = await rail.evaluate((el) => ({
    scrollW: el.scrollWidth, clientW: el.clientWidth,
  }))
  expect(box.scrollW).toBeGreaterThan(box.clientW)

  await rail.evaluate((el) => el.scrollTo({ left: 400 }))
  await page.waitForTimeout(350)
  expect(await rail.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
})

test('the whole page stays under a sane scroll length', async ({ page }) => {
  await page.goto('/')
  const screens = await page.evaluate(() =>
    document.body.scrollHeight / window.innerHeight)
  expect(screens).toBeLessThan(13)
})

test('tap targets in the buy bar are big enough', async ({ page }) => {
  await page.goto('/')
  await page.locator('#box').scrollIntoViewIfNeeded()
  const cta = page.locator('.buybar a')
  const b = await cta.boundingBox()
  expect(b!.height).toBeGreaterThanOrEqual(44)
})
