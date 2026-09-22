import { test, expect, type Page } from '@playwright/test'
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

const fill = async (page: Page, email = 'asha@example.com') => {
  await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Kits', { exact: true }).selectOption('2')
}

const submit = (page: Page) => page.locator('form').getByRole('button', { name: 'Reserve free' }).click()
// Playwright enables the local analytics queue; it never sends these events to Meta.
const events = (page: Page) => page.evaluate(() => window.fbq?.queue ?? [])
const waitForAnalytics = (page: Page) => expect.poll(() => page.evaluate(() =>
  Boolean(window.fbq?.queue))).toBe(true)

test('reserves with only name, email and quantity; reports success only after server confirmation', async ({ page }) => {
  let sent: Record<string, unknown> | undefined
  let confirm: (() => Promise<void>) | undefined
  await page.route('**/api/preorder', (route) => {
    sent = route.request().postDataJSON()
    confirm = () => route.fulfill({ status: 201, json: { status: 'created' } })
  })

  await page.goto('/#reserve')
  await waitForAnalytics(page)
  await fill(page)
  await submit(page)
  await expect.poll(() => Boolean(confirm)).toBe(true)

  expect(sent).toEqual({ name: 'Asha Rao', email: 'asha@example.com', qty: '2', company: '' })
  expect(await events(page)).toContainEqual(['trackCustom', 'ReserveSubmitted', { qty: 2 }])
  expect((await events(page)).some((event) => event[1] === 'Lead')).toBe(false)
  expect((await events(page)).some((event) => event[1] === 'CompleteRegistration')).toBe(false)
  await expect(page.locator('form').getByRole('button', { name: 'Reserving…' })).toBeDisabled()

  await confirm!()
  await expect(page.getByText("You're on the list.")).toBeVisible()
  await expect(page.getByRole('status')).toContainText('collect your shipping details before payment')
  expect((await events(page)).filter((event) => event[1] === 'Lead')).toHaveLength(1)
  expect((await events(page)).filter((event) => event[1] === 'CompleteRegistration')).toHaveLength(1)
})

test('the initial form has no phone, address or profession fields', async ({ page }) => {
  await page.goto('/#reserve')
  await expect(page.locator('form input:not([name="company"]), form select, form textarea')).toHaveCount(3)
  for (const name of ['phone', 'address', 'city', 'pincode', 'profession']) {
    await expect(page.locator(`form [name="${name}"]`)).toHaveCount(0)
  }
  await expect(page.locator('form')).toContainText('₹0 today')
})

test('carries the selected kit quantity from the buy box to the form', async ({ page }) => {
  await page.goto('/')
  const box = page.locator('#buybox')
  await box.getByRole('button', { name: 'More kits' }).click()
  await box.getByRole('button', { name: 'More kits' }).click()
  await box.getByRole('button', { name: 'Reserve free' }).click()
  await expect(page.getByLabel('Kits', { exact: true })).toHaveValue('3')
})

test('tells the visitor when their email is already reserved', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 409, json: { status: 'duplicate', field: 'email' } }))
  await page.goto('/#reserve')
  await waitForAnalytics(page)
  await fill(page)
  await submit(page)
  await expect(page.getByText("You're already on the list.")).toBeVisible()
  expect((await events(page)).some((event) => event[1] === 'Lead')).toBe(false)
})

test('preserves helpful feedback for an existing phone reservation', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 409, json: { status: 'duplicate', field: 'phone' } }))
  await page.goto('/#reserve')
  await fill(page, 'a-different-address@example.com')
  await submit(page)
  await expect(page.getByText('That number is already reserved.')).toBeVisible()
  await expect(page.getByText(/one reservation per person/i)).toBeVisible()
  await expect(page.getByRole('status').getByRole('link', { name: 'support@pebblerobo.com' })).toBeVisible()
  await expect(page.getByText("You're already on the list.")).toHaveCount(0)
})

test('invalid email is caught before the server and can be corrected', async ({ page }) => {
  let calls = 0
  await page.route('**/api/preorder', (route) => {
    calls += 1
    return route.fulfill({ status: 201, json: { status: 'created' } })
  })
  await page.goto('/#reserve')
  await fill(page, 'not-an-email')
  await submit(page)
  await expect(page.getByText('Enter a valid email address')).toBeVisible()
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  expect(calls).toBe(0)
  await page.getByLabel('Email', { exact: true }).fill('asha@example.com')
  await submit(page)
  await expect(page.getByText("You're on the list.")).toBeVisible()
  expect(calls).toBe(1)
})

test('asks for name and email before calling the server', async ({ page }) => {
  let called = false
  await page.route('**/api/preorder', (route) => { called = true; return route.abort() })
  await page.goto('/#reserve')
  await expect(async () => {
    await submit(page)
    await expect(page.getByText('Enter your full name')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15_000 })
  await expect(page.getByText('Enter a valid email address')).toBeVisible()
  expect(called).toBe(false)
})

test('server field validation is visible, retryable and measured without field values', async ({ page }) => {
  let calls = 0
  await page.route('**/api/preorder', (route) => {
    calls += 1
    return calls === 1
      ? route.fulfill({ status: 400, json: { fields: { email: 'Please check this email.' } } })
      : route.fulfill({ status: 201, json: { status: 'created' } })
  })
  await page.goto('/#reserve')
  await waitForAnalytics(page)
  await fill(page)
  await submit(page)
  await expect(page.getByText('Please check this email.')).toBeVisible()
  const recorded = await events(page)
  expect(recorded).toContainEqual(['trackCustom', 'ReserveFieldInvalid', { fields: 'email', source: 'server' }])
  expect(JSON.stringify(recorded)).not.toContain('asha@example.com')
  expect(JSON.stringify(recorded)).not.toContain('Asha Rao')
  expect(recorded.some((event) => event[1] === 'Lead')).toBe(false)
  await page.getByLabel('Email', { exact: true }).fill('asha-corrected@example.com')
  await submit(page)
  await expect(page.getByText("You're on the list.")).toBeVisible()
})

test('honeypot success does not create an advertising conversion', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 201, json: { status: 'created' } }))
  await page.goto('/#reserve')
  await waitForAnalytics(page)
  await fill(page)
  await page.locator('input[name="company"]').evaluate((input: HTMLInputElement) => { input.value = 'bot' })
  await submit(page)
  await expect(page.getByText("You're on the list.")).toBeVisible()
  expect((await events(page)).some((event) => ['Lead', 'CompleteRegistration'].includes(event[1]))).toBe(false)
})

test('an unexpected success response is not reported as a reservation', async ({ page }) => {
  await page.route('**/api/preorder', (route) => route.fulfill({ status: 201, json: {} }))
  await page.goto('/#reserve')
  await waitForAnalytics(page)
  await fill(page)
  await submit(page)
  await expect(page.locator('form [role="alert"]')).toContainText('Try again')
  await expect(page.getByText("You're on the list.")).toHaveCount(0)
  expect((await events(page)).some((event) => ['Lead', 'CompleteRegistration'].includes(event[1]))).toBe(false)
})

test('recovers from a network failure with a retryable message', async ({ page }) => {
  await page.route('**/api/preorder', (route) => route.abort('failed'))
  await page.goto('/#reserve')
  await fill(page)
  await submit(page)
  await expect(page.locator('form [role="alert"]')).toContainText('No connection')
  await expect(page.locator('form').getByRole('button', { name: 'Reserve free' })).toBeEnabled()
})

test('surfaces the unconfigured-database state honestly', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 503, json: { error: 'Reservations are not open yet. Try again shortly.' } }))
  await page.goto('/#reserve')
  await fill(page)
  await submit(page)
  await expect(page.locator('form [role="alert"]')).toContainText('not open yet')
})

test('does not scroll horizontally on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBe(0)
})
