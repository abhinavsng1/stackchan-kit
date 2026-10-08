import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['iPhone 13'] })
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

test('navigation is reachable on a phone', async ({ page }) => {
  await page.goto('/')
  const links = page.locator('.navstrip a')
  // the desktop nav is hidden below xl, so the strip is what must carry them
  await expect(links.filter({ hasText: 'Hardware' }).first()).toBeVisible()
  await expect(page.locator('#buybox').getByRole('button', { name: /^Book/ })).toBeVisible()
})

test('buy bar appears after the hero and retreats over the form', async ({ page }) => {
  await page.goto('/')
  const bar = page.locator('.buybar')

  await expect(bar).toHaveAttribute('data-show', 'false')

  await page.locator('#does').scrollIntoViewIfNeeded()
  await expect(bar).toHaveAttribute('data-show', 'true')

  // it must not cover the form it points at
  await page.locator('#reserve').scrollIntoViewIfNeeded()
  await expect(bar).toHaveAttribute('data-show', 'false')
})

test('buy bar appears after a nav-link jump, not just a smooth scroll', async ({ page }) => {
  // Regression: IntersectionObserver never fired for a jump that skipped past
  // the hero CTA without it ever being visible, so the bar stayed hidden.
  await page.goto('/')
  const bar = page.locator('.buybar')
  // The bar listens for the jump, so the listener has to exist before the jump
  // happens. data-show is written by the client, so its presence is the signal
  // that the component is mounted and watching.
  await expect(bar).toHaveAttribute('data-show', 'false')
  await page.locator('.navstrip a', { hasText: 'Specs' }).click()
  await expect(bar).toHaveAttribute('data-show', 'true')
})

test('build ideas are a swipe rail, not a vertical pile', async ({ page }) => {
  // Six cards stacked on a phone would be two screens of scrolling for one
  // section. The films and the capability clips are rails for the same reason.
  await page.goto('/')
  const rail = page.locator('#builds .rail')
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
  // A guard against runaway growth, not a fixed budget. Raise it deliberately
  // when a section is added, never to make a red test go green.
  // Raised from 17 when the demo band, the touch tile and twelve section clips
  // landed, then from 19 when the video hero went in — measured 19.3 after it.
  // Lowered to 19 when the six capability tiles became one interactive model
  // and the build ideas became a swipe rail: measured 18.0, against 19.3
  // before. Raised to 21 when the parts-cost comparison was added — a real
  // new section carrying the page's strongest argument, measured 20.1. This
  // is the case the note above sanctions: a section was added, not a test
  // nudged to go green. Raised to 23.5 when the page was rebuilt around the
  // assembled robot: three films and a hardware section were added, and the
  // kit kept its parts and build steps as a section of its own. Measured 22.5,
  // after the films, the clips and the capability cards became swipe rails.
  //
  // Raised to 26 in October 2026 when the roles section and the live model
  // were added — two screens of genuinely new content, not slack. The number
  // is a guard against the page quietly becoming an endless scroll, so it is
  // raised deliberately and with a reason, never nudged to make a run green.
  expect(screens).toBeLessThan(26)
})

test('tap targets in the buy bar are big enough', async ({ page }) => {
  await page.goto('/')
  await page.locator('#does').scrollIntoViewIfNeeded()
  const cta = page.locator('.buybar a')
  const b = await cta.boundingBox()
  expect(b!.height).toBeGreaterThanOrEqual(44)
})

test('every nav link actually moves the page', async ({ page }) => {
  // Regression: `scroll-behavior: smooth` plus this page's settling layout made
  // WebKit change the hash and scroll nowhere, so on iOS the nav was inert.
  await page.goto('/')
  for (const label of ['Hardware', 'Specs', 'Builds', 'FAQ']) {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.locator('.navstrip a', { hasText: label }).click()
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)),
      { timeout: 8000 }).toBeGreaterThan(200)
  }
})
