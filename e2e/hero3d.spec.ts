import { test, expect } from '@playwright/test'
import { settleConsent } from './helpers'

test.beforeEach(async ({ page }) => { await settleConsent(page) })

test('desktop gets the 3D model', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 15000 })
})

test('the model is built from the real printed geometry', async ({ page }) => {
  const glb: string[] = []
  page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url()) })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect.poll(() => glb.length, { timeout: 15000 }).toBeGreaterThan(0)
  expect(glb.join(' ')).toContain('shell_SCS0009')
})

test('a phone is offered the model rather than charged for it', async ({ page }) => {
  const glb: string[] = []
  page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url()) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('button', { name: /View the 3D model/ })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.waitForTimeout(1200)
  expect(glb, 'no model bytes before the visitor asks').toEqual([])

  await page.getByRole('button', { name: /View the 3D model/ }).click()
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 15000 })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })

  test('never loads the 3D at all', async ({ page }) => {
    const heavy: string[] = []
    page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) heavy.push(r.url()) })
    await page.goto('/')
    await page.waitForTimeout(1500)
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /View the 3D model/ })).toHaveCount(0)
    expect(heavy, 'a visitor who asked for less motion pays nothing').toEqual([])
  })
})

