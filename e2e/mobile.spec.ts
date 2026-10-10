import { test, expect, devices } from '@playwright/test'
import { settleConsent } from './helpers'

test.use({ ...devices['iPhone 13'] })

test.beforeEach(async ({ page }) => { await settleConsent(page) })

test('the menu opens full screen, every link moves the page, and it closes', async ({ page }) => {
  await page.goto('/')
  const open = page.getByRole('button', { name: 'Open menu' })
  await expect(open).toBeVisible()

  for (const label of ['What it does', 'Where it fits', 'FAQ']) {
    await page.evaluate(() => window.scrollTo(0, 0))
    await open.click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu).toBeVisible()
    await menu.getByRole('link', { name: new RegExp(`^${label}`) }).click()
    await expect(menu).toHaveCount(0)
    // Regression from the old site: on WebKit a smooth scroll plus a settling
    // layout changed the hash and moved nothing. The page must actually move.
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)),
      { timeout: 8000 }).toBeGreaterThan(200)
  }
})

test('Escape closes the menu', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0)
})

test('buy bar appears after the hero and retreats over the buy section and the form', async ({ page }) => {
  await page.goto('/')
  const bar = page.locator('.buybar')
  await expect(bar).toHaveAttribute('data-show', 'false')

  // Not over the demo: its controls sit where the bar would be.
  await page.locator('#does').scrollIntoViewIfNeeded()
  await expect(bar).toHaveAttribute('data-show', 'false')

  await page.locator('#everyday').scrollIntoViewIfNeeded()
  await expect(bar).toHaveAttribute('data-show', 'true')

  await page.locator('#buybox').scrollIntoViewIfNeeded()
  await expect(bar).toHaveAttribute('data-show', 'false')

  await page.locator('#reserve').scrollIntoViewIfNeeded()
  await expect(bar).toHaveAttribute('data-show', 'false')
})

test('buy bar appears after a jump, not just a smooth scroll', async ({ page }) => {
  // IntersectionObserver never fired for a jump that skipped straight past the
  // hero, so the old bar stayed hidden. The bar listens for the hash change.
  await page.goto('/')
  const bar = page.locator('.buybar')
  await expect(bar).toHaveAttribute('data-show', 'false')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: /^Where it fits/ }).click()
  await expect(bar).toHaveAttribute('data-show', 'true')
})

test('tap targets in the buy bar and the menu button are big enough', async ({ page }) => {
  await page.goto('/')
  const menu = await page.getByRole('button', { name: 'Open menu' }).boundingBox()
  expect(menu!.height).toBeGreaterThanOrEqual(44)
  await page.locator('#everyday').scrollIntoViewIfNeeded()
  const cta = await page.locator('.buybar a').boundingBox()
  expect(cta!.height).toBeGreaterThanOrEqual(44)
})

test('the whole page stays under a sane scroll length', async ({ page }) => {
  await page.goto('/')
  const screens = await page.evaluate(() => document.body.scrollHeight / window.innerHeight)
  // A guard against the page quietly becoming an endless scroll, not a fixed
  // budget. Set at the October 2026 redesign, measured at 25 iPhone 13
  // screens with the placeholder stories section showing. Raise it
  // deliberately, with a reason, when a section is added — never to make a
  // run green.
  expect(screens).toBeLessThan(32)
})
