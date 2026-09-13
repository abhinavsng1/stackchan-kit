import { test, expect, type Page } from '@playwright/test'

/** Mixpanel writes an mp_<token>_mixpanel key the moment it initialises. */
const mixpanelUp = (p: Page) =>
  p.evaluate(() => Object.keys(localStorage).some((k) => /^mp_/.test(k)))

test('analytics starts on load, with nothing to agree to first', async ({ page }) => {
  await page.route(/mixpanel\.com/i, (r) => r.fulfill({ status: 200, body: '1' }))
  await page.goto('/')

  await expect(page.getByRole('dialog', { name: 'Analytics choice' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: "That's fine" })).toHaveCount(0)
  await expect.poll(() => mixpanelUp(page), { timeout: 10000 }).toBe(true)
})

test('the Meta pixel is present on first paint, no interaction needed', async ({ page }) => {
  const hits: string[] = []
  page.on('request', (r) => { if (/facebook\.(net|com)/i.test(r.url())) hits.push(r.url()) })

  await page.goto('/')
  await expect.poll(() => hits.some((u) => /fbevents\.js/.test(u)), { timeout: 10000 }).toBe(true)
  await expect.poll(() => hits.some((u) => /1463673029143081/.test(u)), { timeout: 10000 }).toBe(true)
  await expect.poll(
    () => page.evaluate(() => Object.keys(window.fbq?.instance?.pixelsByID ?? {})),
    { timeout: 10000 },
  ).toEqual(['1463673029143081'])
})

test('the footer still discloses what is collected', async ({ page }) => {
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await expect(footer.getByText(/session replays/i)).toBeVisible()
  await expect(footer.getByText(/Meta/)).toBeVisible()
  await expect(footer.getByText(/never recorded/i)).toBeVisible()
})

test('what a visitor types is still never recorded', async ({ page }) => {
  // Masking is a property of the integration, not of consent — removing the
  // gate must not have quietly loosened it.
  await page.goto('/')
  const src = await (await page.request.get('/')).text()
  expect(src).not.toContain('record_mask_all_inputs: false')
})
