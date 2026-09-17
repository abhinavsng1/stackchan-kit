import { test, expect, type Page } from '@playwright/test'

const metaHits = (p: Page) => {
  const hits: string[] = []
  p.on('request', (r) => { if (/facebook\.(net|com)/i.test(r.url())) hits.push(r.url()) })
  return hits
}

test('the pixel loads on arrival, unprompted', async ({ page }) => {
  const hits = metaHits(page)
  await page.goto('/')
  await expect.poll(() => hits.some((u) => /fbevents\.js/.test(u)), { timeout: 10000 }).toBe(true)
  await expect.poll(() => hits.some((u) => /1463673029143081/.test(u)), { timeout: 10000 }).toBe(true)
  await expect.poll(
    () => page.evaluate(() => Object.keys(window.fbq?.instance?.pixelsByID ?? {})),
    { timeout: 10000 },
  ).toEqual(['1463673029143081'])
})

/**
 * Meta refuses to emit beacons on localhost, so asserting on /tr requests would
 * never pass here. Blocking their SDK leaves our own queueing stub in place,
 * and its queue is an exact record of what we asked the pixel to do.
 */
test('a completed reservation asks the pixel for Lead, the conversion', async ({ page }) => {
  await page.route('**/connect.facebook.net/**', (r) => r.abort())
  await page.route('**/api/preorder', (r) => r.fulfill({ status: 201, json: { status: 'created' } }))
  await page.goto('/')
  await page.waitForTimeout(1000)

  // Follow the journey a buyer actually takes: CTA, then the form.
  await page.getByRole('button', { name: /^Reserve/ }).first().click()
  await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
  await page.getByLabel('Email', { exact: true }).fill('asha@example.com')
  await page.getByLabel(/^Phone/).fill('9876543210')
  await page.getByLabel(/^Profession/).selectOption('Robotics')
  await page.getByLabel('Shipping address').fill('12 Silicon Gardenia, 12th Main, JP Nagar')
  await page.getByLabel('City', { exact: true }).fill('Bengaluru')
  await page.getByLabel('PIN code').fill('560078')
  await page.getByRole('button', { name: 'Place my reservation' }).click()

  await expect(page.getByText("You're on the list.")).toBeVisible()

  const calls = await page.evaluate(() =>
    (window.fbq?.queue ?? []).map((c: unknown[]) => [c[0], c[1]].join(' ')))

  expect(calls, 'consent is granted before anything is tracked').toContain('consent grant')
  expect(calls).toContain('init 1463673029143081')
  expect(calls).toContain('track PageView')
  expect(calls, 'the reservation is the conversion Meta should optimise for').toContain('track Lead')
  expect(calls, 'clicking through to the form is the start of checkout')
    .toContain('track InitiateCheckout')
})

test('unmapped events still reach Meta as custom events', async ({ page }) => {
  await page.route('**/connect.facebook.net/**', (r) => r.abort())
  await page.goto('/')
  await page.locator('#box').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Show In the box' }).click()
  await page.waitForTimeout(2500)

  const custom = await page.evaluate(() =>
    (window.fbq?.queue ?? []).filter((c: unknown[]) => c[0] === 'trackCustom').map((c) => c[1]))
  expect(custom.length, 'custom events should be flowing too').toBeGreaterThan(0)
})
