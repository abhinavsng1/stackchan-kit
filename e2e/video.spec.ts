import { test, expect } from '@playwright/test'

/** The demo lives in the product gallery now, behind its own thumbnail. */
async function openVideo(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Show Video' }).click()
  return page.getByTestId('gallery-video')
}

test('the film starts muted, and can be unmuted', async ({ page }) => {
  await page.goto('/')
  const video = await openVideo(page)
  // The file now carries a soundtrack, so silence is a decision rather than a
  // property of the asset. Autoplaying audio at someone is how a tab gets
  // closed; `controls` is what makes turning it on possible.
  await expect(video).toHaveJSProperty('muted', true)
  await expect(video).toHaveJSProperty('loop', true)
  expect((await page.request.get('/media/demo.mp4')).status()).toBe(200)
})

test('downloads nothing until the video is actually chosen', async ({ page }) => {
  const media: string[] = []
  page.on('request', (r) => { if (/\/media\/demo\.(mp4|webm)/.test(r.url())) media.push(r.url()) })

  await page.goto('/')
  await page.waitForTimeout(1500)
  expect(media, 'a megabyte should not load for someone who never opens it').toEqual([])

  await openVideo(page)
  await expect.poll(() => media.length, { timeout: 15000 }).toBeGreaterThan(0)
})

test('runs for forty seconds, as the caption claims', async ({ page }) => {
  await page.goto('/')
  const video = await openVideo(page)
  const seconds = await video.evaluate((v: HTMLVideoElement) =>
    new Promise<number>((resolve) => {
      if (v.duration) return resolve(v.duration)
      v.addEventListener('loadedmetadata', () => resolve(v.duration), { once: true })
    }))
  // The caption states a duration. If the asset is swapped for one of a
  // different length, the page starts lying and this is what catches it.
  expect(Math.round(seconds)).toBe(40)
})

test('the demo band under the hero plays itself, silently', async ({ page }) => {
  await page.goto('/')
  const video = page.getByTestId('demo-video')
  await expect(video).toHaveJSProperty('muted', true)
  await expect(video).toHaveJSProperty('loop', true)
  await page.locator('#demo').scrollIntoViewIfNeeded()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused),
                    { timeout: 15000 }).toBe(true)
})

test.describe('section clips', () => {
  test('each build has its own clip, and none of them load up front', async ({ page }) => {
    const clips: string[] = []
    page.on('request', (r) => { if (/\/media\/clips\//.test(r.url()) && /\.(mp4|webm)$/.test(r.url())) clips.push(r.url()) })

    await page.goto('/')
    await page.waitForTimeout(1200)
    expect(clips, 'clips are decoration; they must not cost anything above the fold').toEqual([])

    await page.locator('#build-ideas').scrollIntoViewIfNeeded()
    await expect.poll(() => clips.length, { timeout: 20000 }).toBeGreaterThan(0)

    // Six cards, six distinct clips — a repeated file would mean a wiring slip.
    const slugs = await page.locator('#build-ideas video').evaluateAll((vs) =>
      vs.map((v) => (v as HTMLVideoElement).querySelector('source')?.getAttribute('src') ?? ''))
    expect(slugs).toHaveLength(6)
    expect(new Set(slugs).size).toBe(6)
  })

  test('the capability clips run muted, and only the face tile offers sound', async ({ page }) => {
    await page.goto('/')
    await page.locator('#does').scrollIntoViewIfNeeded()
    const vids = page.locator('#does video')
    await expect.poll(() => vids.count()).toBe(6)
    expect(await vids.evaluateAll((vs) => vs.every((v) => (v as HTMLVideoElement).muted))).toBe(true)
    await expect(page.locator('#does').getByRole('button', { name: /Sound/ })).toHaveCount(1)
  })
})

test('the caption and the file agree on how long the film is', async ({ page }) => {
  await page.goto('/')
  // The band loads nothing until it is near the viewport, so there is no
  // duration to read until it has been reached.
  await page.locator('#demo').scrollIntoViewIfNeeded()
  const caption = await page.locator('#demo figcaption').innerText()
  // innerText returns the rendered text, and the label is uppercased in CSS.
  const claimed = Number(caption.match(/(\d+)\s*seconds/i)?.[1])
  expect(claimed).not.toBeNaN()
  const actual = await page.getByTestId('demo-video').evaluate((v: HTMLVideoElement) =>
    new Promise<number>((resolve) => {
      if (v.duration) return resolve(v.duration)
      v.addEventListener('loadedmetadata', () => resolve(v.duration), { once: true })
    }), { timeout: 20_000 })
  expect(Math.round(actual)).toBe(claimed)
})
