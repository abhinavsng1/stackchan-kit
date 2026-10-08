import { test, expect } from '@playwright/test'
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

/**
 * Stubs the payment leg. Razorpay's own modal is theirs to test; what matters
 * here is that the form hands off to it correctly and handles each answer.
 */
async function stubCheckout(
  page: import('@playwright/test').Page,
  outcome: 'paid' | 'dismissed' = 'paid',
) {
  await page.route('**/checkout.razorpay.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: `
      window.Razorpay = function (options) {
        return {
          open: function () {
            if (${outcome === 'paid' ? 'true' : 'false'}) {
              options.handler({
                razorpay_payment_id: 'pay_TEST', razorpay_order_id: 'order_TEST',
                razorpay_signature: '${'a'.repeat(64)}',
              })
            } else { options.modal.ondismiss() }
          },
          on: function () {},
        }
      }
    ` }))
  await page.route('**/api/create-order', (route) =>
    route.fulfill({ status: 201, json: {
      key_id: 'rzp_test_stub', order_id: 'order_TEST', amount: 49900, currency: 'INR',
      prefill: { name: 'Asha Rao', email: 'asha@example.com', contact: '+919876543210' },
    } }))
  await page.route('**/api/verify-payment', (route) =>
    route.fulfill({ status: 200, json: { status: 'verified', payment_id: 'pay_TEST' } }))
}

const fill = async (page: import('@playwright/test').Page, email = 'asha@example.com') => {
  await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel(/^Phone/).fill('9876543210')
  await page.getByLabel(/^Profession/).selectOption('Embedded / firmware')
  await page.getByLabel('Shipping address').fill('12 Silicon Gardenia, 12th Main, JP Nagar 5th Phase')
  await page.getByLabel('City', { exact: true }).fill('Bengaluru')
  await page.getByLabel('PIN code').fill('560078')
  await page.getByLabel('Quantity', { exact: true }).selectOption('2')
}

test('takes an order, collects payment, and confirms', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 201, json: { status: 'created', token: 'a'.repeat(32) } }))
  await stubCheckout(page, 'paid')

  await page.goto('/')
  await page.locator('#buybox').getByRole('button', { name: /^Buy PebbleRobo/ }).click()
  await fill(page)
  await page.getByRole('button', { name: /^Book for / }).click()

  const panel = page.locator('#reserve')
  await expect(panel.getByText('Your PebbleRobo is booked.')).toBeVisible()
  // COD: the one thing they must know before the courier turns up.
  await expect(panel.getByText(/in cash/).first()).toBeVisible()
})

test('a closed payment window leaves the order payable, not lost', async ({ page }) => {
  let creates = 0
  await page.route('**/api/preorder', (route) => {
    creates += 1
    route.fulfill({ status: 201, json: { status: 'created', token: 'a'.repeat(32) } })
  })
  await stubCheckout(page, 'dismissed')

  await page.goto('/#reserve')
  await fill(page)
  await page.getByRole('button', { name: /^Book for / }).click()

  // Nothing was charged, so nothing in this panel may imply anything is held.
  const panel = page.locator('#reserve')
  await expect(panel.getByText('Not paid yet')).toBeVisible()
  await expect(panel.getByText(/Nothing has been charged/)).toBeVisible()
  await expect(panel.getByText(/is booked|already ordered/i)).toHaveCount(0)

  // A way back to paying, and a human to ask.
  await expect(panel.getByRole('link', { name: 'support@pebblerobo.com' }).first())
    .toBeVisible()

  // Pressing again must not create a second order — that would collide with
  // the unique email and dead-end them.
  const again = page.getByRole('button', { name: /^Pay .* and book/ })
  await expect(again).toBeEnabled()
  await again.click()
  await expect.poll(() => creates).toBe(1)
})

test('a buyer returning to an unpaid order is offered payment, not a dead end', async ({ page }) => {
  // The row exists from an earlier visit and was never paid for.
  await page.route('**/api/preorder', (route) => route.fulfill({
    status: 409,
    json: { status: 'duplicate', field: 'email', paid: false, token: 'c'.repeat(32) },
  }))
  await stubCheckout(page, 'dismissed')

  await page.goto('/#reserve')
  await fill(page)
  await page.getByRole('button', { name: /^Book for / }).click()

  const panel = page.locator('#reserve')
  await expect(panel.getByText('You started this booking. It is not paid for.')).toBeVisible()
  await expect(panel.getByRole('button', { name: /^Pay .* and book/ })).toBeEnabled()
  await expect(panel.getByRole('link', { name: 'support@pebblerobo.com' }).first())
    .toBeVisible()
  // "Already ordered" is what this used to say, and it stranded them.
  await expect(panel.getByText(/already ordered/i)).toHaveCount(0)
})

test('a paid duplicate is still told they already ordered', async ({ page }) => {
  await page.route('**/api/preorder', (route) => route.fulfill({
    status: 409,
    json: { status: 'duplicate', field: 'email', paid: true, token: null },
  }))

  await page.goto('/#reserve')
  await fill(page)
  await page.getByRole('button', { name: /^Book for / }).click()

  const panel = page.locator('#reserve')
  await expect(panel.getByText(/already ordered/i).first()).toBeVisible()
  // No second payment offered for something already paid for.
  await expect(panel.getByRole('button', { name: /^Pay .* and book/ })).toHaveCount(0)
})

test('tells the visitor when their email is already reserved', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 409, json: { status: 'duplicate', field: 'email' } }))

  await page.goto('/#reserve')
  await fill(page)
  await page.getByRole('button', { name: /^Book for / }).click()

  await expect(page.getByText('That email has already ordered.')).toBeVisible()
})

test('explains a reused phone instead of claiming the email is on the list', async ({ page }) => {
  // A real person hit this: they reserved once, then filled the form again with
  // a different email but the same number, and "you're already on the list"
  // told them nothing useful.
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 409, json: { status: 'duplicate', field: 'phone' } }))

  await page.goto('/#reserve')
  await fill(page, 'a-different-address@example.com')
  await page.getByRole('button', { name: /^Book for / }).click()

  await expect(page.getByText('That number has already ordered.')).toBeVisible()
  await expect(page.getByText(/one order per person per batch/i)).toBeVisible()
  await expect(page.getByRole('status').getByRole('link', { name: 'support@pebblerobo.com' })).toBeVisible()
  // It must not claim the email is the problem — the visitor knows it is new.
  await expect(page.getByText('That email has already ordered.')).toHaveCount(0)
})

test('shows a field error and never calls the server', async ({ page }) => {
  let called = false
  await page.route('**/api/preorder', (route) => { called = true; route.abort() })

  await page.goto('/#reserve')
  await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
  await page.getByLabel('Email', { exact: true }).fill('not-an-email')
  await page.getByRole('button', { name: /^Book for / }).click()

  await expect(page.getByText('Enter a valid email address')).toBeVisible()
  expect(called).toBe(false)
})

test('asks for every field it needs before calling the server', async ({ page }) => {
  let called = false
  await page.route('**/api/preorder', (r) => { called = true; r.abort() })

  await page.goto('/#reserve')
  await expect(async () => {
    await page.getByRole('button', { name: /^Book for / }).click()
    await expect(page.getByText('Enter your full name')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15_000 })

  for (const message of [
    'Enter your full name',
    'Enter a valid email address',
    'Enter a 10-digit Indian mobile number',
    'Enter the full address we should ship to',
    'Enter your city',
    'Enter a 6-digit PIN code',
  ]) {
    await expect(page.getByText(message)).toBeVisible()
  }
  expect(called).toBe(false)
})

test('an order goes through without a profession', async ({ page }) => {
  let sent: Record<string, unknown> | null = null
  await page.route('**/api/preorder', async (route) => {
    sent = route.request().postDataJSON()
    await route.fulfill({ status: 201, json: { status: 'created', token: 'a'.repeat(32) } })
  })
  await stubCheckout(page, 'paid')

  await page.goto('/#reserve')
  await fill(page)
  await page.getByLabel(/^Profession/).selectOption('')
  await page.getByRole('button', { name: /^Book for / }).click()

  await expect(page.getByText('Your PebbleRobo is booked.')).toBeVisible()
  expect(sent!.profession, 'an unanswered profession must not block the sale').toBe('')
})

test('rejects a phone number that is not a mobile', async ({ page }) => {
  await page.goto('/#reserve')
  await fill(page)
  await page.getByLabel(/^Phone/).fill('1234567890')
  await page.getByRole('button', { name: /^Book for / }).click()
  await expect(page.getByText('Enter a 10-digit Indian mobile number')).toBeVisible()
})

test('recovers from a network failure with a retryable message', async ({ page }) => {
  await page.route('**/api/preorder', (route) => route.abort('failed'))

  await page.goto('/#reserve')
  await fill(page)
  await page.getByRole('button', { name: /^Book for / }).click()

  await expect(page.locator('form [role="alert"]')).toContainText('No connection')
  await expect(page.getByRole('button', { name: /^Book for / })).toBeEnabled()
})

test('surfaces the unconfigured-database state honestly', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 503, json: { error: 'Reservations are not open yet. Try again shortly.' } }))

  await page.goto('/#reserve')
  await fill(page)
  await page.getByRole('button', { name: /^Book for / }).click()

  await expect(page.locator('form [role="alert"]')).toContainText('not open yet')
})

test('does not scroll horizontally on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBe(0)
})

test.describe('robot or kit', () => {
  /** Captures what the form sends, and answers as if the order were saved. */
  async function capture(page: import('@playwright/test').Page) {
    const sent: Array<Record<string, unknown>> = []
    await page.route('**/api/preorder', (route) => {
      sent.push(route.request().postDataJSON())
      return route.fulfill({ status: 201, json: { status: 'created', token: 'a'.repeat(32) } })
    })
    await stubCheckout(page, 'paid')
    return sent
  }

  test('an order is for the assembled robot unless the kit is chosen', async ({ page }) => {
    const sent = await capture(page)
    await page.goto('/')
    await fill(page)
    await page.getByRole('button', { name: /^Book for / }).click()
    await expect(page.getByText('Your PebbleRobo is booked.')).toBeVisible()
    expect(sent[0].edition).toBe('assembled')
  })

  test('choosing the kit in the buy box orders the kit from the form', async ({ page }) => {
    // The choice is made in one place and paid for in another; the two must agree.
    const sent = await capture(page)
    await page.goto('/')
    // The buy box offers the kit as a quiet alternative, not an equal choice.
    await page.locator('#buybox').getByRole('button', { name: 'The kit is the same price' }).click()
    await expect(page.locator('form input[name="edition"]:checked')).toHaveValue('kit')
    await fill(page)
    await page.getByRole('button', { name: /^Book for / }).click()
    await expect(page.getByText('Your PebbleRobo is booked.')).toBeVisible()
    expect(sent[0].edition).toBe('kit')
  })

  test('kit content appears only once the kit is chosen, and one press takes it away', async ({ page }) => {
    await page.goto('/')
    // The default is the robot: no build instructions, no banner, no kit link.
    await expect(page.locator('#kit')).toHaveCount(0)
    await expect(page.getByTestId('kit-banner')).toHaveCount(0)
    await expect(page.locator('header a[href="#kit"]')).toHaveCount(0)

    await page.locator('#buybox').getByRole('button', { name: 'The kit is the same price' }).click()
    await expect(page.locator('#kit')).toBeVisible()
    await expect(page.getByTestId('kit-banner')).toContainText('kit selected')

    await page.getByTestId('kit-banner').getByRole('button').click()
    await expect(page.locator('#kit')).toHaveCount(0)
    await expect(page.getByTestId('kit-banner')).toHaveCount(0)
    await expect(page.locator('form input[name="edition"]:checked')).toHaveValue('assembled')
  })

  test('a link to ?edition=kit lands on the kit', async ({ page }) => {
    await page.goto('/?edition=kit')
    await expect(page.locator('#buybox')).toContainText('Build-it-yourself kit')
    await expect(page.locator('form input[name="edition"]:checked')).toHaveValue('kit')
  })
})
