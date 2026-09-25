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

test.describe('discoverability', () => {
  test('a crawler can find the sitemap and is kept out of payment pages', async ({ page }) => {
    const robots = await page.request.get('/robots.txt')
    expect(robots.status()).toBe(200)
    const body = await robots.text()
    expect(body).toContain('Sitemap: https://pebblerobo.com/sitemap.xml')
    // /checkout carries a payment token in the URL; it must never be indexed.
    expect(body).toMatch(/Disallow:\s*\/checkout/)
    expect(body).toMatch(/Disallow:\s*\/api\//)
  })

  test('the product is described in structured data, with a price a search engine can show',
    async ({ page }) => {
      await page.goto('/')
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
      expect(blocks).toHaveLength(1)
      const graph = JSON.parse(blocks[0])['@graph'] as Array<Record<string, unknown>>
      const types = graph.map((n) => n['@type'])
      expect(types).toEqual(expect.arrayContaining(['Organization', 'Product', 'FAQPage']))

      const product = graph.find((n) => n['@type'] === 'Product') as Record<string, never>
      const offer = product.offers as unknown as Record<string, string>
      expect(offer.priceCurrency).toBe('INR')
      // A price with a currency symbol or comma in it is invalid schema.org and
      // is silently dropped, taking the rich result with it.
      expect(offer.price).toMatch(/^\d+$/)
    })

  test('llms.txt states the price and stays in step with the page', async ({ page }) => {
    const res = await page.request.get('/llms.txt')
    expect(res.status()).toBe(200)
    const text = await res.text()
    await page.goto('/')
    const shown = (await page.locator('#buybox').innerText()).match(/₹[\d,]+/)?.[0]
    expect(shown).toBeTruthy()
    expect(text).toContain(shown!)
    expect(text).toContain('Ships to India only')
  })
})
