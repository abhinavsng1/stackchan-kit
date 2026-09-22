import { test, expect } from '@playwright/test'

test('browser tests never load production analytics SDKs', async ({ page }) => {
  const remote: string[] = []
  page.on('request', (r) => {
    if (/facebook\.(net|com)|mixpanel\.com/i.test(r.url())) remote.push(r.url())
  })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => window.fbq?.queue?.length ?? 0)).toBeGreaterThan(0)
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /^mp_/.test(k)))).toEqual([])
  expect(remote).toEqual([])
})

test('the footer still discloses production collection', async ({ page }) => {
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await expect(footer.getByText(/session replays/i)).toBeVisible()
  await expect(footer.getByText(/Meta/)).toBeVisible()
  await expect(footer.getByText(/never recorded/i)).toBeVisible()
})
