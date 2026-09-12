import { test, expect } from '@playwright/test'
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

const fill = async (page: import('@playwright/test').Page, email = 'asha@example.com') => {
  await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel(/^Phone/).fill('9876543210')
  await page.getByLabel('Profession').selectOption('Embedded / firmware')
  await page.getByLabel('Shipping address').fill('12 Silicon Gardenia, 12th Main, JP Nagar 5th Phase')
  await page.getByLabel('City', { exact: true }).fill('Bengaluru')
  await page.getByLabel('PIN code').fill('560078')
  await page.getByLabel('Kits').selectOption('2')
}

test('reserves a kit and confirms', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 201, json: { status: 'created' } }))

  await page.goto('/')
  await page.getByRole('link', { name: 'Reserve a kit' }).click()
  await fill(page)
  await page.getByRole('button', { name: 'Reserve a kit' }).click()

  await expect(page.getByText("You're on the list.")).toBeVisible()
})

test('tells the visitor when their email is already reserved', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 409, json: { status: 'duplicate' } }))

  await page.goto('/#reserve')
  await fill(page)
  await page.getByRole('button', { name: 'Reserve a kit' }).click()

  await expect(page.getByText("You're already on the list.")).toBeVisible()
})

test('shows a field error and never calls the server', async ({ page }) => {
  let called = false
  await page.route('**/api/preorder', (route) => { called = true; route.abort() })

  await page.goto('/#reserve')
  await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
  await page.getByLabel('Email', { exact: true }).fill('not-an-email')
  await page.getByRole('button', { name: 'Reserve a kit' }).click()

  await expect(page.getByText('Enter a valid email address')).toBeVisible()
  expect(called).toBe(false)
})

test('asks for every field it needs before calling the server', async ({ page }) => {
  let called = false
  await page.route('**/api/preorder', (r) => { called = true; r.abort() })

  await page.goto('/#reserve')
  await page.getByRole('button', { name: 'Reserve a kit' }).click()

  for (const message of [
    'Enter your full name',
    'Enter a valid email address',
    'Enter a 10-digit Indian mobile number',
    'Pick the closest one',
    'Enter the full address we should ship to',
    'Enter your city',
    'Enter a 6-digit PIN code',
  ]) {
    await expect(page.getByText(message)).toBeVisible()
  }
  expect(called).toBe(false)
})

test('rejects a phone number that is not a mobile', async ({ page }) => {
  await page.goto('/#reserve')
  await fill(page)
  await page.getByLabel(/^Phone/).fill('1234567890')
  await page.getByRole('button', { name: 'Reserve a kit' }).click()
  await expect(page.getByText('Enter a 10-digit Indian mobile number')).toBeVisible()
})

test('recovers from a network failure with a retryable message', async ({ page }) => {
  await page.route('**/api/preorder', (route) => route.abort('failed'))

  await page.goto('/#reserve')
  await fill(page)
  await page.getByRole('button', { name: 'Reserve a kit' }).click()

  await expect(page.locator('form [role="alert"]')).toContainText('No connection')
  await expect(page.getByRole('button', { name: 'Reserve a kit' })).toBeEnabled()
})

test('surfaces the unconfigured-database state honestly', async ({ page }) => {
  await page.route('**/api/preorder', (route) =>
    route.fulfill({ status: 503, json: { error: 'Reservations are not open yet. Try again shortly.' } }))

  await page.goto('/#reserve')
  await fill(page)
  await page.getByRole('button', { name: 'Reserve a kit' }).click()

  await expect(page.locator('form [role="alert"]')).toContainText('not open yet')
})

test('does not scroll horizontally on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBe(0)
})
