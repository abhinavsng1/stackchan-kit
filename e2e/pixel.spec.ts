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

test('only a confirmed reservation sends Lead and CompleteRegistration', async ({ page }) => {
  let release: (() => void) | undefined
  const pending = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/preorder', async (route) => {
    await pending
    await route.fulfill({ status: 201, json: { status: 'created' } })
  })
  await page.goto('/')
  await expect.poll(() => calls(page)).toContain('init test-pixel')
  await page.getByRole('button', { name: /^Reserve/ }).first().click()
  await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
  await page.getByLabel('Email', { exact: true }).fill('asha@example.com')
  await page.locator('form button[type="submit"]').click()
  await expect.poll(() => calls(page)).toContain('trackCustom ReserveSubmitted')
  expect(await calls(page)).not.toContain('track Lead')
  expect(await calls(page)).not.toContain('track CompleteRegistration')
  release!()
  await expect(page.getByText("You're on the list.")).toBeVisible()
  const completed = await calls(page)
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
    await page.getByLabel('Name', { exact: true }).fill('Asha Rao')
    await page.getByLabel('Email', { exact: true }).fill('asha@example.com')
    await page.locator('form button[type="submit"]').click()
    await expect.poll(() => calls(page)).toContain(status === 400 ? 'trackCustom ReserveFieldInvalid'
      : status === 409 ? 'trackCustom ReserveAlreadyHeld' : 'trackCustom ReserveFailed')
    expect(await calls(page)).not.toContain('track Lead')
    expect(await calls(page)).not.toContain('track CompleteRegistration')
  })
}
