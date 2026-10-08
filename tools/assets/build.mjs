/**
 * The asset pipeline: STL in, GLB and renders out.
 *
 * One command, no manual steps: `npm run assets`.
 *
 * It runs in a headless browser rather than Blender. That is a deliberate
 * swap. The site's live model is three.js, so rendering the stills with the
 * same renderer, the same geometry file and the same materials means a render
 * in the gallery and the model you can drag cannot disagree with each other.
 * Cycles would look better in isolation and worse in context, and it would add
 * a gigabyte of toolchain that nothing else in this repo needs.
 */
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const OUT = join(ROOT, 'public/media/render')
const MODELS = join(ROOT, 'public/models')

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.stl': 'application/octet-stream', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png',
}

/** Serve the repo so the browser can import three and fetch the STLs. */
function serve() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    const path = join(ROOT, normalize(url).replace(/^(\.\.[/\\])+/, ''))
    if (!path.startsWith(ROOT) || !existsSync(path)) { res.writeHead(404).end(); return }
    try {
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
      res.end(await readFile(path))
    } catch { res.writeHead(500).end() }
  })
  return new Promise((r) => server.listen(0, () => r({ server, port: server.address().port })))
}

const ANGLES = {
  hero: { pos: [120, 95, 185], target: [0, 32, 0] },
  three_quarter: { pos: [150, 80, 150], target: [0, 32, 0] },
  front: { pos: [0, 45, 210], target: [0, 32, 0] },
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await mkdir(MODELS, { recursive: true })
  const { server, port } = await serve()
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl'] })
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 })
  page.on('console', (m) => { if (m.type() === 'error') console.error('  page:', m.text()) })

  await page.goto(`http://localhost:${port}/tools/assets/stage.html`)
  await page.waitForFunction(() => window.__ready === true, { timeout: 60000 })

  // --- GLB -------------------------------------------------------------
  const glb = await page.evaluate(() => window.__exportGLB())
  await writeFile(join(MODELS, 'pebble.glb'), Buffer.from(glb))
  const kb = (Buffer.from(glb).length / 1024).toFixed(0)
  console.log(`  public/models/pebble.glb  ${kb} KB`)

  // --- renders ---------------------------------------------------------
  const manifest = []
  const shots = [
    ['hero-still', 'hero', null, 'The assembled robot, three-quarter view'],
    ['role-pet', 'three_quarter', 'happy', 'The robot with a happy face'],
    ['role-answers', 'front', 'curious', 'The robot facing forward, listening'],
    ['role-performer', 'three_quarter', 'excited', 'The robot mid-performance'],
    ['role-puppet', 'three_quarter', 'surprised', 'The robot copying a face'],
    ['role-yours', 'front', 'neutral', 'The robot with a blank face'],
  ]

  for (const [name, angle, face, alt] of shots) {
    for (const w of [800, 1600]) {
      const buf = await page.evaluate(
        ([a, f, width]) => window.__render(a, f, width), [angle, face, w])
      const file = `${name}@${w}.webp`
      await writeFile(join(OUT, file), Buffer.from(buf))
      manifest.push({ file, width: w, height: Math.round(w * 0.75), alt, render: true })
    }
    console.log(`  ${name}  800 + 1600`)
  }

  await writeFile(join(OUT, 'manifest.json'), JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    note: 'Every entry is a render. Real photography lives in public/media/robot/.',
    assets: manifest,
  }, null, 2) + '\n')

  // The poster the live model shows until the GLB has loaded.
  const poster = await page.evaluate(() => window.__render('hero', 'neutral', 1200))
  await writeFile(join(MODELS, 'pebble-poster.webp'), Buffer.from(poster))
  console.log('  public/models/pebble-poster.webp')

  await browser.close()
  server.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
