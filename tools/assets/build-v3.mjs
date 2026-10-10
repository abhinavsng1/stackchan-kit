/**
 * Product shots of the v3 body.
 *
 * The robot renders on a transparent ground and everything around it — the
 * glow, the reflection, the ground itself — is composited afterwards. That
 * split is deliberate: a halo rendered in-engine is a sprite fighting the
 * depth buffer and a reflection is a second pass over the whole scene,
 * whereas in a compositor both are a gradient and a flip, controlled exactly,
 * and re-tuned without re-rendering anything.
 *
 *   node tools/assets/build-v3.mjs
 */
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const OUT = join(ROOT, 'public/media/shots')
const TMP = join(ROOT, '.shots-tmp')

const SHELLS = [
  { id: 'graphite', name: 'Graphite', hex: '#2b2d31' },
  { id: 'bone', name: 'Bone', hex: '#e9e6df' },
  { id: 'signal', name: 'Signal', hex: '#5ce1e6' },
  { id: 'ember', name: 'Ember', hex: '#d2552f' },
  { id: 'moss', name: 'Moss', hex: '#7f9b55' },
]

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.stl': 'application/octet-stream' }

function serve() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    const path = join(ROOT, normalize(url).replace(/^(\.\.[/\\])+/, ''))
    if (!path.startsWith(ROOT) || !existsSync(path)) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    res.end(await readFile(path))
  })
  return new Promise((r) => server.listen(0, () => r({ server, port: server.address().port })))
}

/**
 * Put the rendered robot on a ground, with a glow behind and a reflection
 * under it.
 *
 * The reflection is the robot flipped, pushed down, faded out with a linear
 * ramp and knocked back to a quarter opacity — which is what a matte surface
 * does, and what stops the object floating in a void.
 */
async function compose(src, out, { w, h, accent, tmp }) {
  const bg = join(tmp, 'bg.png')
  const refl = join(tmp, 'refl.png')
  const alpha = join(tmp, 'alpha.png')

  /* The ground: warm paper with one soft pool of light where the robot
     stands. On a light ground a coloured bloom reads as a stain, so this is
     a near-white lift rather than a tint, and the accent is left to the page
     around it. */
  void accent
  // Drawn at full frame. Resizing a smaller gradient and placing it leaves a
  // hard rectangle where the pool stops, which on paper is immediately
  // visible as a box around the product.
  await run('magick', ['-size', `${w}x${h}`,
    'radial-gradient:#ffffff-#f1e8e2', '-blur', '0x24', bg])

  /* The reflection. The robot's own alpha is multiplied by a vertical ramp,
     so the silhouette survives and only its opacity falls away — copying the
     ramp into alpha outright would reflect a rectangle. */
  const rh = Math.round(h * 0.40)
  await run('magick', [src, '-flip', '-resize', `${w}x${rh}!`, '-alpha', 'extract',
    '(', '-size', `${w}x${rh}`, 'gradient:gray38-black', ')',
    '-compose', 'multiply', '-composite', alpha])
  await run('magick', [src, '-flip', '-resize', `${w}x${rh}!`, alpha,
    '-alpha', 'off', '-compose', 'copyopacity', '-composite', refl])

  await run('magick', [bg,
    refl, '-gravity', 'south', '-geometry', `+0+${Math.round(h * 0.06)}`,
    '-compose', 'over', '-composite',
    src, '-gravity', 'center', '-geometry', `+0-${Math.round(h * 0.07)}`,
    '-compose', 'over', '-composite',
    '-quality', '92', out])
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await mkdir(TMP, { recursive: true })
  const { server, port } = await serve()
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
  })
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } })
  page.on('console', (m) => { if (m.type() === 'error') console.error('  page:', m.text()) })
  page.on('pageerror', (e) => console.error('  page error:', String(e).slice(0, 200)))

  await page.goto(`http://localhost:${port}/tools/assets/stage-v3.html`)
  await page.waitForFunction(() => window.__ready === true, { timeout: 90000 })

  const W = 1600, H = 1200
  const manifest = []

  // One hero per shell colour, plus a couple of angles on the house colour.
  const shots = [
    ...SHELLS.map((s) => ({ name: `shell-${s.id}`, shell: s, angle: 'hero', face: 'happy',
      alt: `Pebble-chan in ${s.name}` })),
    { name: 'hero', shell: SHELLS[0], angle: 'hero', face: 'neutral', alt: 'Pebble-chan, three-quarter view' },
    { name: 'front', shell: SHELLS[0], angle: 'front', face: 'curious', alt: 'Pebble-chan facing forward' },
    { name: 'high', shell: SHELLS[0], angle: 'high', face: 'excited', alt: 'Pebble-chan from above' },
  ]

  for (const shot of shots) {
    await page.evaluate((hex) => window.__setShell(hex), shot.shell.hex)
    const { png, accent } = await page.evaluate(
      ([a, f, w, h]) => window.__render(a, f, w, h), [shot.angle, shot.face, W, H])
    const raw = join(TMP, `${shot.name}.png`)
    await writeFile(raw, Buffer.from(png))
    const out = join(OUT, `${shot.name}.webp`)
    await compose(raw, out, { w: W, h: H, accent, tmp: TMP })

    // The same render with nothing behind it. The hero draws its own glow
    // and shadow in CSS, so a shot with a ground baked in shows up there as
    // a dark rectangle floating on the page — which is exactly what it did.
    await run('magick', [raw, '-resize', `${W}x${H}`, '-quality', '92',
      '-define', 'webp:lossless=false', join(OUT, `float-${shot.name}.webp`)])
    manifest.push({
      file: `${shot.name}.webp`, width: W, height: H, alt: shot.alt,
      shell: shot.shell.name, render: true,
    })
    console.log(`  ${shot.name.padEnd(16)} ${shot.shell.name}`)
  }

  await writeFile(join(OUT, 'manifest.json'), JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    source: 'assets-src/stl/assembled_v3.stl — the real printed body',
    note: 'Every entry is a render and is labelled as one on the page.',
    shells: SHELLS,
    assets: manifest,
  }, null, 2) + '\n')

  await browser.close()
  server.close()
  await rm(TMP, { recursive: true, force: true })
}

main().catch((e) => { console.error(e); process.exit(1) })
