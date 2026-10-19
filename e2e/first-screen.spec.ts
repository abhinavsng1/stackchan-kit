import { test, expect, type Page } from '@playwright/test'

/**
 * Three visitors in four never leave the first screen, and on a slow phone
 * the scripts can take seconds to arrive. So the first screen has to finish
 * arriving without them: the entrance runs in CSS from the first paint.
 * These run with JavaScript switched off, which is that slow phone at its
 * limit.
 */

/** What the eye gets: the product of every ancestor's opacity. */
const opacity = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => {
  let o = 1
  for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
  return o
})

test.describe('the first screen, before any script runs', () => {
  test.use({ javaScriptEnabled: false })

  test('shows the robot, the Book button and the line under it', async ({ page }) => {
    await page.goto('/')
    for (const selector of ['#hero img[alt^="PebbleRobo in"]', '#hero a[href="#reserve"]', '#hero .t-lead']) {
      await expect.poll(() => opacity(page, selector), { message: selector, timeout: 5000 }).toBeGreaterThan(0.99)
    }
  })

  test('raises every word of the headline into place', async ({ page }) => {
    await page.goto('/')
    // Each word rises inside its own clipped box. Risen means its top has
    // reached the top of that box; still waiting means it sits a line below.
    const lowest = () => page.locator('#hero h1').evaluate((h1) => Math.max(
      ...[...h1.querySelectorAll(':scope > span > span > span')].map((word) =>
        word.getBoundingClientRect().top - word.parentElement!.getBoundingClientRect().top),
    ))
    await expect.poll(lowest, { timeout: 5000 }).toBeLessThan(1)
  })

  test('keeps a space between the words of the headline', async ({ page }) => {
    await page.goto('/')
    // Every word but the last on its line carries its space inside its box.
    const tightest = await page.locator('#hero h1').evaluate((h1) => Math.min(
      ...[...h1.querySelectorAll(':scope > span')].flatMap((line) =>
        [...line.querySelectorAll(':scope > span')].slice(0, -1).map((box) =>
          box.getBoundingClientRect().width - box.firstElementChild!.getBoundingClientRect().width)),
    ))
    expect(tightest).toBeGreaterThan(2)
  })
})
