import { test, expect, type Page } from '@playwright/test'

const calls = (page: Page) => page.evaluate(() =>
  (window.fbq?.queue ?? []).map((call) => `${call[0]} ${call[1]}`))

test('local test mode initializes a queue without contacting Meta', async ({ page }) => {
  const hits: string[] = []
  page.on('request', (r) => { if (/facebook\.(net|com)/i.test(r.url())) hits.push(r.url()) })
  await page.goto('/')
  await expect.poll(() => calls(page)).toContain('init test-pixel')
  expect(await calls(page)).toContain('track PageView')
  expect(hits).toEqual([])
})

/** The order form needs everything required to ship a box before it submits. */
async function fillOrder(page: import('@playwright/test').Page) {
  await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
  await page.getByLabel('Email', { exact: true }).fill('asha@example.com')
  await page.getByLabel(/^Phone/).fill('9876543210')
  await page.getByLabel('Shipping address').fill('12 Silicon Gardenia, JP Nagar 5th Phase')
  await page.getByLabel('City', { exact: true }).fill('Bengaluru')
  await page.getByLabel('PIN code').fill('560078')
}

test('only a confirmed reservation sends Lead and CompleteRegistration', async ({ page }) => {
  let release: (() => void) | undefined
  const pending = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/preorder', async (route) => {
    await pending
    await route.fulfill({ status: 201, json: { status: 'created', token: 'a'.repeat(32) } })
  })
  // Payment is stubbed out: this test is about which pixel events fire, and
  // when — not about Razorpay.
  await page.route('**/api/create-order', (r) => r.fulfill({ status: 503, json: { error: 'stub' } }))
  await page.goto('/')
  await expect.poll(() => calls(page)).toContain('init test-pixel')
  await page.getByRole('button', { name: /^Order/ }).first().click()
  await fillOrder(page)
  await page.locator('form button[type="submit"]').click()
  await expect.poll(() => calls(page)).toContain('trackCustom ReserveSubmitted')
  expect(await calls(page)).not.toContain('track Lead')
  expect(await calls(page)).not.toContain('track CompleteRegistration')
  release!()
  // Lead fires when the order is stored. Purchase only fires once paid, which
  // this test deliberately prevents — so it must be absent below.
  await expect.poll(() => calls(page)).toContain('track Lead')
  const completed = await calls(page)
  expect(completed).not.toContain('track Purchase')
  expect(completed.filter((c) => c === 'track Lead')).toHaveLength(1)
  expect(completed.filter((c) => c === 'track CompleteRegistration')).toHaveLength(1)
  expect(completed).toContain('track InitiateCheckout')
})

for (const status of [400, 409, 500]) {
  test(`HTTP ${status} never sends a successful conversion`, async ({ page }) => {
    const json = status === 400 ? { fields: { email: 'Check your email.' } }
      : status === 409 ? { status: 'duplicate', field: 'email' } : { error: 'Try again.' }
    await page.route('**/api/preorder', (r) => r.fulfill({ status, json }))
    await page.goto('/')
    await expect.poll(() => calls(page)).toContain('init test-pixel')
    await fillOrder(page)
    await page.locator('form button[type="submit"]').click()
    await expect.poll(() => calls(page)).toContain(status === 400 ? 'trackCustom ReserveFieldInvalid'
      : status === 409 ? 'trackCustom ReserveAlreadyHeld' : 'trackCustom ReserveFailed')
    expect(await calls(page)).not.toContain('track Lead')
    expect(await calls(page)).not.toContain('track CompleteRegistration')
  })
}
