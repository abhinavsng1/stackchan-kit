import { test, expect } from '@playwright/test'

/**
 * Every moving picture on the page is real footage of a batch 01 unit, and
 * every one of them is either silent decoration or a film somebody chose to
 * play. These tests hold both halves of that: decoration costs nothing until
 * it is near, and nothing makes a sound unasked.
 */

const duration = (v: HTMLVideoElement) => new Promise<number>((resolve) => {
  if (v.duration) return resolve(v.duration)
  v.addEventListener('loadedmetadata', () => resolve(v.duration), { once: true })
})

test.describe('the hero loop', () => {
  test('plays itself, silently, on repeat', async ({ page }) => {
    await page.goto('/')
    const video = page.getByTestId('hero-video')
    await expect(video).toHaveJSProperty('muted', true)
    await expect(video).toHaveJSProperty('loop', true)
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused),
                      { timeout: 15000 }).toBe(true)
  })

  test('stays inside the hero budget', async ({ page }) => {
    // docs/design-system.md caps the hero at 800 KB. Nothing above the fold
    // may cost more than it.
    for (const file of ['/media/robot/hero.mp4', '/media/robot/hero.webm']) {
      const res = await page.request.get(file)
      expect(res.status()).toBe(200)
      expect((await res.body()).length, file).toBeLessThanOrEqual(800 * 1024)
    }
  })
})

test.describe('the films', () => {
  test('download nothing until one is pressed', async ({ page }) => {
    const media: string[] = []
    page.on('request', (r) => { if (/\/film-\w+\.(mp4|webm)$/.test(r.url())) media.push(r.url()) })

    await page.goto('/')
    await page.locator('#watch').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    expect(media, 'eleven megabytes must not load for someone who never presses play').toEqual([])

    await page.getByRole('button', { name: /Play Meet Pebble-chan/ }).click()
    await expect.poll(() => media.length, { timeout: 15000 }).toBeGreaterThan(0)
    expect(media.every((u) => /film-meet/.test(u))).toBe(true)
  })

  test('a pressed film plays, and pressing another pauses it', async ({ page }) => {
    await page.goto('/')
    await page.locator('#watch').scrollIntoViewIfNeeded()
    const first = page.getByTestId('film-meet')
    const second = page.getByTestId('film-look')

    await page.getByRole('button', { name: /Play Meet Pebble-chan/ }).click()
    await expect.poll(() => first.evaluate((v: HTMLVideoElement) => !v.paused),
                      { timeout: 15000 }).toBe(true)

    await page.getByRole('button', { name: /Play Looking around/ }).click()
    await expect.poll(() => second.evaluate((v: HTMLVideoElement) => !v.paused),
                      { timeout: 15000 }).toBe(true)
    await expect(first).toHaveJSProperty('paused', true)
  })

  test('each states its real length', async ({ page }) => {
    // The label is a claim. If a file is swapped for one of a different
    // length, the page starts lying and this is what catches it.
    await page.goto('/')
    await page.locator('#watch').scrollIntoViewIfNeeded()
    for (const [key, title] of [['meet', 'Meet Pebble-chan'], ['made', 'From printer to desk'],
                                ['look', 'Looking around']]) {
      const button = page.getByRole('button', { name: new RegExp(`Play ${title}`) })
      const label = (await button.getAttribute('aria-label'))!.match(/(\d+):(\d{2})/)!
      const claimed = Number(label[1]) * 60 + Number(label[2])
      await button.click()
      const actual = await page.getByTestId(`film-${key}`).evaluate(duration)
      expect(Math.abs(actual - claimed), `${title}: ${actual}s against ${claimed}s`).toBeLessThanOrEqual(1)
    }
  })
})

test.describe('section clips', () => {
  test('each capability has its own clip, none loads up front, and all are silent', async ({ page }) => {
    const clips: string[] = []
    page.on('request', (r) => { if (/\/media\/robot\/clip-/.test(r.url()) && /\.(mp4|webm)$/.test(r.url())) clips.push(r.url()) })

    await page.goto('/')
    await page.waitForTimeout(1200)
    expect(clips, 'clips are decoration; they must not cost anything above the fold').toEqual([])

    await page.locator('#does').scrollIntoViewIfNeeded()
    await expect.poll(() => clips.length, { timeout: 20000 }).toBeGreaterThan(0)

    const sources = await page.locator('#does video').evaluateAll((vs) =>
      vs.map((v) => (v as HTMLVideoElement).querySelector('source')?.getAttribute('src') ?? ''))
    expect(sources).toHaveLength(3)
    expect(new Set(sources).size).toBe(3)

    const vids = page.locator('#does video')
    expect(await vids.evaluateAll((vs) => vs.every((v) => (v as HTMLVideoElement).muted))).toBe(true)
  })
})
