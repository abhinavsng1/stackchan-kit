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

test.describe('the hero', () => {
  test('is the robot, not a video, and makes no sound', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('hero-robot')).toBeVisible()
    expect(await page.locator('#hero video').count()).toBe(0)
  })
})

test.describe('the film', () => {
  const PLAY = /Play An afternoon with PebbleRobo/

  test('downloads nothing until it is pressed', async ({ page }) => {
    const media: string[] = []
    page.on('request', (r) => { if (/\/film-\w+\.(mp4|webm)$/.test(r.url())) media.push(r.url()) })

    await page.goto('/')
    await page.locator('#meet').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    expect(media, 'a film must not load for someone who never presses play').toEqual([])

    await page.getByRole('button', { name: PLAY }).click()
    await expect.poll(() => media.length, { timeout: 15000 }).toBeGreaterThan(0)
    expect(media.every((u) => /film-meet/.test(u))).toBe(true)
    await expect.poll(() => page.getByTestId('film-meet').evaluate((v: HTMLVideoElement) => !v.paused),
                      { timeout: 15000 }).toBe(true)
  })

  test('states its real length', async ({ page }) => {
    // The label is a claim. If the file is swapped for one of a different
    // length, the page starts lying and this is what catches it.
    await page.goto('/')
    await page.locator('#meet').scrollIntoViewIfNeeded()
    const button = page.getByRole('button', { name: PLAY })
    const label = (await button.getAttribute('aria-label'))!.match(/(\d+):(\d{2})/)!
    const claimed = Number(label[1]) * 60 + Number(label[2])
    await button.click()
    const actual = await page.getByTestId('film-meet').evaluate(duration)
    expect(Math.abs(actual - claimed), `${actual}s against ${claimed}s`).toBeLessThanOrEqual(1)
  })
})

test.describe('section clips', () => {
  test('each capability has its own clip, none loads up front, and all are silent', async ({ page }) => {
    const clips: string[] = []
    page.on('request', (r) => { if (/\/media\/render\/loop-/.test(r.url()) && /\.(mp4|webm)$/.test(r.url())) clips.push(r.url()) })

    await page.goto('/')
    await page.waitForTimeout(1200)
    expect(clips, 'clips are decoration; they must not cost anything above the fold').toEqual([])

    await page.locator('#does').scrollIntoViewIfNeeded()
    await expect.poll(() => clips.length, { timeout: 20000 }).toBeGreaterThan(0)

    // Each behaviour has its own clip. On a wide screen they are rendered
    // twice — once in the pinned frame, once inline for phones — so it is the
    // distinct clips that are counted.
    const sources = await page.locator('#does video').evaluateAll((vs) =>
      vs.map((v) => (v as HTMLVideoElement).poster))
    expect(new Set(sources).size).toBe(3)

    const vids = page.locator('#does video')
    expect(await vids.evaluateAll((vs) => vs.every((v) => (v as HTMLVideoElement).muted))).toBe(true)
  })
})
