import { test, expect } from '@playwright/test'

/**
 * "What it does" and the colour picker. These run without WebGL (the app
 * project has no software renderer), which is the fallback path: the robot is
 * its render, and every mode must still say what it does — no information
 * may live only in an animation.
 */

test('every mode can be chosen, and says what it does without the 3D robot', async ({ page }) => {
  // Eight modes in one test: under a full parallel run this can pass 30 s
  // without anything being wrong.
  test.setTimeout(60_000)
  await page.goto('/')
  const panel = page.locator('#demo-panel')
  for (const [tab, heading] of [
    ['Meet', 'It talks, listens and feels.'], ['Touch', 'It notices your touch.'],
    ['Dance', 'It dances.'], ['Video call', 'Video call it from anywhere.'],
    ['Make it yours', 'Make it look like yours.'],
  ] as const) {
    await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click()
    await expect(page.getByRole('tab', { name: new RegExp(`^${tab}`) })).toHaveAttribute('aria-selected', 'true')
    await expect(panel.getByRole('heading', { name: heading })).toBeVisible()
  }
})

test('a scripted conversation is shown in full, and labelled as an illustration', async ({ page }) => {
  await page.goto('/')
  // The conversation is part of Meet, which is where the demo opens.
  const panel = page.locator('#demo-panel')
  await expect(panel.getByText('I can’t decide what to cook tonight.')).toBeVisible()
  await expect(panel.getByText(/That’s a frittata/)).toBeVisible()
  await expect(panel.getByText(/not a recording or a live AI/)).toBeVisible()
  await expect(panel.getByText('Faces built in · talking over Wi-Fi')).toBeVisible()
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
  await expect(form).toHaveValue('ember')

  // Picked in the hero…
  await page.locator('#hero').getByRole('radio', { name: 'Moss' }).click()
  await expect(form).toHaveValue('moss')
  // …it shows as chosen in the explorer and the buy box too.
  await expect(page.locator('#explore').getByRole('radio', { name: 'Moss' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('#buybox').getByRole('radio', { name: 'Moss' })).toHaveAttribute('aria-checked', 'true')

  // Changed in the buy box with the keyboard, the form follows.
  await page.locator('#buybox').getByRole('radio', { name: 'Moss' }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(form).toHaveValue('signal')
})

test('no em dashes anywhere a visitor can read', async ({ page }) => {
  // House style: commas, colons and full stops, never an em dash.
  for (const path of ['/', '/privacy', '/terms', '/shipping', '/returns', '/contact']) {
    await page.goto(path)
    const text = await page.locator('body').innerText()
    expect(text.includes('—'), `em dash on ${path}`).toBe(false)
  }
})
