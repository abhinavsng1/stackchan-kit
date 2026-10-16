import { test, expect } from '@playwright/test'

/**
 * "What it does" and the colour picker. These run without WebGL (the app
 * project has no software renderer), which is the fallback path: the robot is
 * its render, and every mode must still say what it does — no information
 * may live only in an animation.
 */

test('every mode can be chosen, and says what it does without the 3D robot', async ({ page }) => {
  // Capability controls remain available as text when WebGL is unavailable.
  test.setTimeout(60_000)
  await page.goto('/')
  const panel = page.locator('#demo-panel')
  for (const [tab, heading] of [
    ['Camera & movement', 'You’re in the picture.'],
    ['Dance', 'Press play. Watch it groove.'],
    ['AI assistant', 'More than a voice.'],
  ] as const) {
    await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click()
    await expect(page.getByRole('tab', { name: new RegExp(`^${tab}`) })).toHaveAttribute('aria-selected', 'true')
    await expect(panel.getByRole('heading', { name: heading })).toBeVisible()
  }
})

test('assistant samples are interactive and explicitly labelled', async ({ page }) => {
  await page.goto('/#does')
  await page.getByRole('tab', { name: 'AI assistant', exact: true }).click()
  const panel = page.locator('#demo-panel')
  await expect(panel.getByText(/Sample responses with your browser/)).toBeVisible()
  await panel.getByRole('button', { name: 'Help me plan my day', exact: false }).click()
  await expect(panel.getByRole('status')).toContainText('Give it your freshest hour')
  await panel.getByRole('button', { name: 'Stop voice', exact: true }).click()
})

test('gallery has four selectable videos and old duplicate sections are absent', async ({ page }) => {
  await page.goto('/#films')
  const gallery = page.getByLabel('PebbleRobo video gallery', { exact: true })
  for (let n = 1; n <= 4; n++) {
    await gallery.getByRole('button', { name: `Show video ${n}`, exact: true }).click()
    await expect(gallery.getByRole('group', { name: `Video ${n} of 4`, exact: true })).toBeVisible()
  }
  await expect(page.locator('#everyday')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'No renders here.' })).toHaveCount(0)
})

test('nothing on the page claims what does not ship, or talks to developers', async ({ page }) => {
  // Not shipping yet. The words must not get ahead of the product.
  await page.goto('/')
  const text = (await page.locator('main').innerText()).toLowerCase()
  for (const claim of ['takes a photo', 'rock-paper-scissors', 'rock, paper', 'wake word', 'firmware', 'esp-now', 'nfc', 'moddable', 'arduino', 'open source', 'open-source']) {
    expect(text, `unsupported claim: "${claim}"`).not.toContain(claim)
  }
})

test('a colour picked anywhere is the colour the order form sends', async ({ page }) => {
  await page.goto('/')
  const form = page.locator('#reserve form input[name="shell"]')
  await expect(form).toHaveValue('graphite')

  // Picked in the hero…
  await page.locator('#hero').getByRole('radio', { name: 'White' }).click()
  await expect(form).toHaveValue('bone')
  // …it shows as chosen in the explorer and the buy box too.
  await expect(page.locator('#explore').getByRole('radio', { name: 'White' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('#buybox').getByRole('radio', { name: 'White' })).toHaveAttribute('aria-checked', 'true')

  // Changed in the buy box with the keyboard, the form follows.
  await page.locator('#buybox').getByRole('radio', { name: 'White' }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(form).toHaveValue('graphite')
})

test('no em dashes anywhere a visitor can read', async ({ page }) => {
  // House style: commas, colons and full stops, never an em dash.
  for (const path of ['/', '/privacy', '/terms', '/shipping', '/returns', '/contact']) {
    await page.goto(path)
    const text = await page.locator('body').innerText()
    expect(text.includes('—'), `em dash on ${path}`).toBe(false)
  }
})
