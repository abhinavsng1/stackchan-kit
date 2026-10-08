import { test, expect } from '@playwright/test'
import { settleConsent } from './helpers'

/**
 * The X pixel, end to end, against the queue its base code installs (test
 * mode: X's script never loads, nothing reaches X). Each event must carry the
 * id created for it in Events Manager, and the two the server also reports
 * must carry the same conversion_id the server is given, or X counts them
 * twice.
 */

test.beforeEach(async ({ page }) => { await settleConsent(page) })

type Call = [string, string, Record<string, unknown>?]
const xCalls = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(JSON.stringify(window.twq?.queue ?? [])) as Call[])
const eventsFor = async (page: import('@playwright/test').Page, id: string) =>
  (await xCalls(page)).filter((c) => c[0] === 'event' && c[1] === id)

test('reports content, checkout, lead and purchase under their Events Manager ids', async ({ page }) => {
  const sent: Array<Record<string, unknown>> = []
  await page.route('**/api/preorder', (route) => {
    sent.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: { status: 'created', token: 'a'.repeat(32) } })
  })
  await page.route('**/checkout.razorpay.com/**', (route) => route.fulfill({
    status: 200, contentType: 'application/javascript', body: `
      window.Razorpay = function (options) {
        return { open: function () { options.handler({
          razorpay_payment_id: 'pay_TEST', razorpay_order_id: 'order_TEST',
          razorpay_signature: '${'a'.repeat(64)}' }) }, on: function () {} }
      }` }))
  await page.route('**/api/create-order', (route) => route.fulfill({ status: 201, json: {
    key_id: 'rzp_test_stub', order_id: 'order_TEST', amount: 49900, currency: 'INR',
    prefill: { name: 'Asha Rao', email: 'asha@example.com', contact: '+919876543210' },
  } }))
  await page.route('**/api/verify-payment', (route) =>
    route.fulfill({ status: 200, json: { status: 'verified', payment_id: 'pay_TEST' } }))

  await page.goto('/')
  await expect.poll(() => xCalls(page).then((c) => c[0])).toEqual(['config', 'rfx4u'])

  // Content view: once, however many sections go past.
  await page.locator('#buy').scrollIntoViewIfNeeded()
  await page.locator('#specs').scrollIntoViewIfNeeded()
  await expect.poll(async () => (await eventsFor(page, 'tw-rfx4u-rgpxm')).length).toBe(1)

  // Checkout initiated: the buy box's Book button.
  await page.locator('#buybox').getByRole('button', { name: /^Book/ }).click()
  await expect.poll(async () => (await eventsFor(page, 'tw-rfx4u-rgpxi')).length).toBe(1)

  // Lead and Purchase: a whole order, paid.
  await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
  await page.getByLabel('Email', { exact: true }).fill('asha@example.com')
  await page.getByLabel(/^Phone/).fill('9876543210')
  await page.getByLabel('Shipping address').fill('12 Silicon Gardenia, 12th Main, JP Nagar 5th Phase')
  await page.getByLabel('City', { exact: true }).fill('Bengaluru')
  await page.getByLabel('PIN code').fill('560078')
  await page.getByRole('button', { name: /^Book for / }).click()
  await expect(page.getByText('Your Pebble-chan is booked.')).toBeVisible()

  const lead = await eventsFor(page, 'tw-rfx4u-rgpxh')
  expect(lead).toHaveLength(1)
  // The id the server was given for this order is the one the pixel used.
  expect(typeof sent[0].xid).toBe('string')
  expect(lead[0][2]).toEqual({ conversion_id: sent[0].xid })

  const purchase = await eventsFor(page, 'tw-rfx4u-rgpx2')
  expect(purchase).toHaveLength(1)
  // The Razorpay payment id — the same value the server reports the sale under.
  expect(purchase[0][2]).toMatchObject({
    conversion_id: 'pay_TEST', value: 4999, currency: 'INR',
    contents: [{ content_id: 'PBL-BOT-01', num_items: 1 }],
  })
})
