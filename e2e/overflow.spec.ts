import { test, expect } from '@playwright/test'

/**
 * No horizontal scrollbar, at any width anyone actually uses.
 *
 * This exists because the page shipped one twice: first from a hero glow
 * inset at -18%, then from a callout chip anchored on the left that grew
 * rightwards off the screen. Both were invisible at 1440, which was the only
 * width being checked, and both put a scrollbar on every page of the site.
 *
 * The widths are the common laptop and desktop sizes plus the two phone
 * widths, because the failures landed between the ones being tested rather
 * than at the extremes.
 */
const WIDTHS = [2560, 1920, 1680, 1440, 1366, 1280, 1152, 1024, 834, 768, 414, 390, 360]

for (const width of WIDTHS) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // The hero's model loads lazily and can change layout when it arrives.
    await page.waitForTimeout(1500)

    const { scrollWidth, culprits } = await page.evaluate(() => {
      const out: string[] = []
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect()
        if (r.right <= window.innerWidth + 1 || r.width < 30) continue
        let clipped = false
        let a = el.parentElement
        while (a) {
          if (getComputedStyle(a).overflowX !== 'visible') { clipped = true; break }
          a = a.parentElement
        }
        if (!clipped) out.push(`${el.tagName}.${String(el.className).slice(0, 50)}`)
      }
      return { scrollWidth: document.documentElement.scrollWidth, culprits: [...new Set(out)] }
    })

    expect(scrollWidth, `overflowing: ${culprits.join(' | ') || 'unknown'}`)
      .toBeLessThanOrEqual(width)
  })
}
