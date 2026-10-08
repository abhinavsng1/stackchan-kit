/**
 * The site's renders, in the site's own light.
 *
 *   node tools/assets/build-site.mjs
 *
 * Every shot comes from public/models/pebble-v3.glb — the rig the live robot
 * uses — so the renders and the robot on the page agree on everything,
 * including which way the base faces. Each one is a render and is labelled
 * as one wherever it appears.
 *
 * Three grounds, matching the page:
 *   float   transparent, for places the page draws its own floor
 *   studio  a white sweep with a soft contact shadow, like a product table
 *   stage   near-black with a warm pool, for the one dark section
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
const TMP = join(ROOT, '.shots-tmp/site')

// The colourways and the face are compiled from lib/ first, so the renders
// read the same definitions as the site.
await run('npx', ['tsc', 'lib/companion-face.ts', 'lib/robot-look.ts', 'lib/shells.ts', '--ignoreConfig',
  '--target', 'es2020', '--module', 'es2020', '--outDir', 'tools/assets/.gen', '--skipLibCheck'], { cwd: ROOT })
const { SHELLS } = await import('./.gen/shells.js')
const SHELL = Object.fromEntries(SHELLS.map((s) => [s.id, s]))

/** Front-left three-quarter, a touch above: the product's best side. */
const HERO = [-0.55, 0.2, -0.82]

const SHOTS = [
  // The hero and the colour picker: one per shell, floating.
  ...Object.keys(SHELL).map((id) => ({
    out: `public/media/shots/float-shell-${id}.webp`, ground: 'float', w: 1600, h: 1200,
    dir: HERO, fill: 0.95, units: [{ shell: SHELL[id], mood: 'awake', pan: -10, tilt: 4 }],
    alt: `PebbleRobo in ${SHELL[id].name}`,
  })),
  // Talk to it: low, looking up at you, listening. Lit for the dark stage.
  {
    out: 'public/media/render/role-answers', sizes: [1600, 800], ground: 'stage', w: 1600, h: 1200,
    dir: [-0.5, 0.12, -0.86], fill: 0.95, look: 'stage',
    units: [{ shell: SHELL.signal, mood: 'listening', pan: -4, tilt: -10 }],
    alt: 'PebbleRobo in Signal, looking up, listening',
  },
  // A performer: head turned mid-line, pleased with itself.
  {
    out: 'public/media/render/role-performer', sizes: [1600, 800], ground: 'stage', w: 1600, h: 1000,
    dir: [0.6, 0.16, -0.78], fill: 1.0, look: 'stage',
    units: [{ shell: SHELL.ember, mood: 'pleased', pan: -30, tilt: -6 }],
    alt: 'PebbleRobo in Ember, head turned, smiling',
  },
  // A puppet: turned to follow someone off to the side.
  {
    out: 'public/media/render/role-puppet', sizes: [1600, 800], ground: 'stage', w: 1600, h: 1000,
    dir: [-0.9, 0.1, -0.42], fill: 1.0, look: 'stage',
    units: [{ shell: SHELL.moss, mood: 'awake', pan: 36, tilt: 8 }],
    alt: 'PebbleRobo in Moss, turning its head',
  },
  // A pet: from above, dozing.
  {
    out: 'public/media/render/role-pet', sizes: [1600, 800], ground: 'studio', w: 1600, h: 1200,
    dir: [-0.4, 0.62, -0.68], fill: 1.0,
    units: [{ shell: SHELL.moss, mood: 'resting', pan: -6, tilt: 10 }],
    alt: 'PebbleRobo in Moss, seen from above, resting',
  },
  // What's inside: the stack pulled apart.
  {
    out: 'public/media/render/role-yours', sizes: [1600, 800], ground: 'studio', w: 1200, h: 1500,
    dir: [-0.62, 0.3, -0.72], fill: 0.95,
    units: [{ shell: SHELL.graphite, mood: 'thinking', pan: -8, tilt: 0, explode: 0.6 }],
    alt: 'PebbleRobo pulled apart: base, neck, head and controller',
  },
  // Meet it: the face, close, pleased to see you.
  {
    out: 'public/media/render/meet-face.webp', ground: 'studio', w: 1080, h: 1350,
    dir: [-0.3, 0.08, -1], fill: 0.62, aim: [0, 14, 0],
    units: [{ shell: SHELL.graphite, mood: 'pleased', pan: -6, tilt: 2 }],
    alt: 'PebbleRobo in Graphite, close up, smiling',
  },
  // The buy gallery: five angles on one robot.
  ...[
    ['hero', [-0.55, 0.2, -0.82], 'awake', -10, 4],
    ['front', [0, 0.1, -1], 'pleased', 0, 0],
    ['right', [0.62, 0.14, -0.8], 'pleased', 14, 2],
    ['profile', [-1, 0.1, -0.12], 'awake', 26, 0],
    ['high', [-0.4, 0.55, -0.72], 'listening', -6, -8],
  ].map(([name, dir, mood, pan, tilt]) => ({
    out: `public/media/render/gallery-${name}.webp`, ground: 'studio', w: 1080, h: 1350,
    dir, fill: 0.9, units: [{ shell: SHELL.graphite, mood, pan, tilt }],
    alt: `PebbleRobo in Graphite, ${{ hero: 'three-quarter', front: 'front', right: 'from the right', profile: 'in profile', high: 'from above' }[name]} view`,
  })),
  // All five, side by side.
  {
    out: 'public/media/render/lineup', sizes: [2400, 1200], ground: 'studio', w: 2400, h: 1000,
    dir: [-0.12, 0.14, -1], fill: 0.46,
    // Seen from the front, world +X is screen left, so the row is listed
    // right to left to read Graphite to Moss.
    units: ['moss', 'signal', 'ember', 'bone', 'graphite'].map((id, i) => ({
      shell: SHELL[id], mood: ['awake', 'pleased', 'listening', 'awake', 'pleased'][i],
      pan: [18, 8, 0, -8, -18][i], tilt: [4, 0, -4, 0, 4][i], z: [10, 4, 0, 4, 10][i],
    })),
    alt: 'Five PebbleRobos in a row, one in each shell colour',
  },
]

/**
 * Short loops for the personality section: the same robot, doing the three
 * things the section talks about. Rendered frame by frame from the rig, so
 * each movement is the real range of the real servos, eased the same way.
 * `pose(p)` gets the loop's progress, 0 to 1, and must end where it started.
 */
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * x)
/** Speech, as a mouth: syllables inside words, words inside a phrase. */
const speech = (t) => Math.max(0, Math.sin(Math.PI * 2 * 6.5 * t)) * (0.45 + 0.55 * Math.max(0, Math.sin(Math.PI * 2 * 1.4 * t)))
/** Smoothstep from a to b over [t0, t1]. */
const between = (p, t0, t1, a, b) => {
  const x = Math.min(1, Math.max(0, (p - t0) / (t1 - t0)))
  return a + (b - a) * x * x * (3 - 2 * x)
}

const LOOPS = [
  {
    // What's inside: assembled, then apart — base, neck, head, face module —
    // held long enough to see each part, then back together.
    out: 'public/media/render/loop-inside', w: 896, h: 1120, frames: 168, dir: [-0.6, 0.26, -0.76], fill: 0.98,
    // Framed on the fully exploded pose, so nothing leaves the frame.
    frameAt: { shell: SHELL.graphite, mood: 'thinking', explode: 1, pan: -10 },
    pose: (p) => {
      const e = between(p, 0.14, 0.38, 0, 1) - between(p, 0.72, 0.94, 0, 1)
      return { shell: SHELL.graphite, mood: e > 0.5 ? 'thinking' : 'awake', clock: p * 7000,
        explode: e, pan: -10 + 8 * Math.sin(Math.PI * 2 * p), tilt: 0 }
    },
  },
  {
    // Say its name: it is looking elsewhere, notices you, looks up and
    // listens, then answers — mouth moving, small nods — and drifts back.
    out: 'public/media/render/loop-talk', w: 1200, h: 900, frames: 168, ground: 'stage', look: 'stage',
    dir: [-0.5, 0.12, -0.86], fill: 0.95,
    pose: (p) => {
      const turn = between(p, 0.12, 0.24, 0, 1) - between(p, 0.86, 0.98, 0, 1)
      const talking = p > 0.42 && p < 0.84
      return {
        shell: SHELL.signal, clock: 1000 + p * 7000,
        mood: p < 0.12 || p > 0.9 ? 'awake' : talking ? 'awake' : 'listening',
        // From this camera, negative pan looks away and positive turns to you.
        pan: -24 * (1 - turn) + 14 * turn, tilt: 4 - 14 * turn + (talking ? 3 * Math.sin(Math.PI * 2 * 3 * p) : 0),
        speak: talking ? speech((p - 0.42) * 7) : 0,
      }
    },
  },
  {
    // A performer: swaying through a line, bobbing on the beat.
    out: 'public/media/render/loop-performer', w: 1280, h: 800, frames: 120, ground: 'stage', look: 'stage',
    dir: [0.6, 0.16, -0.78], fill: 1.0,
    pose: (p) => ({
      shell: SHELL.ember, mood: 'pleased', clock: 900 + p * 3200,
      pan: -24 * Math.sin(Math.PI * 2 * p), tilt: -2 + 7 * Math.sin(Math.PI * 2 * 4 * p),
      speak: p < 0.8 ? speech(p * 5) : 0,
    }),
  },
  {
    // A puppet: holding still, then turning and tilting the way you do.
    out: 'public/media/render/loop-puppet', w: 1280, h: 800, frames: 120, ground: 'stage', look: 'stage',
    dir: [-0.9, 0.1, -0.42], fill: 1.0,
    pose: (p) => ({
      shell: SHELL.moss, mood: 'awake', clock: 2000 + p * 5000,
      pan: 36 + between(p, 0.1, 0.25, 0, -30) + between(p, 0.45, 0.6, 0, 52) + between(p, 0.8, 0.95, 0, -22),
      tilt: 8 + between(p, 0.1, 0.25, 0, 8) + between(p, 0.45, 0.6, 0, -18) + between(p, 0.8, 0.95, 0, 10),
    }),
  },
  {
    out: 'public/media/render/loop-alive', w: 720, h: 900, frames: 120, dir: [-0.42, 0.12, -0.9], fill: 0.86,
    // Breathing, a blink, and the smallest sway: alive while doing nothing.
    pose: (p) => ({ shell: SHELL.ember, mood: 'awake', clock: 2600 + p * 5000,
      pan: -6 + Math.sin(Math.PI * 2 * p) * 3, tilt: 2 + Math.sin(Math.PI * 4 * p) * 1.2 }),
  },
  {
    out: 'public/media/render/loop-look', w: 720, h: 900, frames: 144, dir: [-0.2, 0.12, -1], fill: 0.86,
    // A glance one way, then the other.
    pose: (p) => ({ shell: SHELL.ember, mood: 'awake', clock: p * 6000,
      pan: Math.sin(Math.PI * 2 * p) * 38, tilt: 2 + Math.sin(Math.PI * 4 * p) * 3 }),
  },
  {
    out: 'public/media/render/loop-nod', w: 720, h: 900, frames: 120, dir: [-0.5, 0.1, -0.86], fill: 0.86,
    // Two nods, a pause, and back.
    pose: (p) => ({ shell: SHELL.ember, mood: 'pleased', clock: 900 + p * 3000,
      pan: -8, tilt: p < 0.7 ? 12 * Math.sin(Math.PI * 2 * (p / 0.35)) * (1 - ease(p / 0.7) * 0.2) : 0 }),
  },
]

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' }

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

/** Put the robot on its ground: background, then shadow, then the robot. */
async function compose(src, out, { w, h, ground, foot }) {
  if (ground === 'float') {
    await run('magick', [src, '-quality', '90', out])
    return
  }
  const bg = join(TMP, 'bg.png')
  const shadow = join(TMP, 'shadow.png')

  if (ground === 'studio') {
    // A sweep: a touch lighter at the top, a soft lift behind the product.
    // A sweep: lighter at the top, settling to the table at the bottom, with
    // one broad soft lift behind the product.
    await run('magick', ['-size', `${w}x${h}`, 'gradient:#f8f8f6-#e8e8e5',
      '(', '-size', `${w}x${h}`, 'xc:none', '-fill', 'rgba(255,255,255,0.55)',
      '-draw', `ellipse ${w / 2},${h * 0.45} ${w * 0.42},${h * 0.4} 0,360`, '-blur', '0x120', ')',
      '-compose', 'over', '-composite', bg])
  } else {
    // The stage: near-black with a low warm pool where it stands.
    await run('magick', ['-size', `${w}x${h}`, 'xc:#0e0e0e',
      '(', '-size', `${Math.round(w * 0.9)}x${Math.round(h * 0.7)}`, 'radial-gradient:#2a2420-#0e0e0e', ')',
      '-gravity', 'south', '-geometry', `+0+${Math.round(-h * 0.08)}`, '-compose', 'over', '-composite', bg])
  }

  // Contact shadow: a tight dark ellipse where it touches, inside a wide soft
  // one — which is what a matte table under soft light actually shows.
  const cx = (foot.left + foot.right) / 2
  const cy = foot.bottom - (foot.bottom - foot.top) * 0.35
  const fw = (foot.right - foot.left)
  const fh = Math.max(12, (foot.bottom - foot.top) * 0.55)
  const ink = ground === 'stage' ? 'rgba(0,0,0,0.85)' : 'rgba(17,17,17,0.30)'
  const soft = ground === 'stage' ? 'rgba(0,0,0,0.55)' : 'rgba(17,17,17,0.12)'
  await run('magick', ['-size', `${w}x${h}`, 'xc:none',
    '-fill', soft, '-draw', `ellipse ${cx},${cy} ${fw * 0.75},${fh * 1.1} 0,360`, '-blur', '0x40',
    '(', '-size', `${w}x${h}`, 'xc:none', '-fill', ink,
    '-draw', `ellipse ${cx},${cy} ${fw * 0.48},${fh * 0.45} 0,360`, '-blur', '0x12', ')',
    '-compose', 'over', '-composite', shadow])

  if (!src) {
    await run('magick', [bg, shadow, '-compose', 'over', '-composite', out])
    return
  }
  await run('magick', [bg, shadow, '-compose', 'over', '-composite',
    src, '-compose', 'over', '-composite', '-quality', '90', out])
}

async function main() {
  await mkdir(TMP, { recursive: true })
  const { server, port } = await serve()
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
  })
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  page.on('pageerror', (e) => console.error('  page error:', String(e).slice(0, 300)))
  await page.goto(`http://localhost:${port}/tools/assets/stage-site.html`)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 })

  const manifest = []
  for (const shot of SHOTS) {
    const { png, foot } = await page.evaluate((s) => window.__render(s), {
      w: shot.w, h: shot.h, look: shot.look ?? 'studio', dir: shot.dir, fill: shot.fill, units: shot.units,
      aim: shot.aim ?? [0, 0, 0],
    })
    const raw = join(TMP, 'raw.png')
    await writeFile(raw, Buffer.from(png.split(',')[1], 'base64'))

    const targets = shot.sizes
      ? shot.sizes.map((s) => [`${shot.out}@${s}.webp`, s])
      : [[shot.out, shot.w]]
    const full = join(TMP, 'full.webp')
    await compose(raw, full, { w: shot.w, h: shot.h, ground: shot.ground, foot })
    for (const [file, width] of targets) {
      await run('magick', [full, '-resize', `${width}x`, '-quality', '88', join(ROOT, file)])
      manifest.push({ file: file.replace(/^public/, ''), alt: shot.alt, render: true })
    }
    console.log(`  ${shot.out}`)
  }

  const only = process.argv.includes('--loops') || !process.argv.includes('--stills')
  for (const loop of only ? LOOPS : []) {
    const dir = join(TMP, 'frames')
    await rm(dir, { recursive: true, force: true })
    await mkdir(dir, { recursive: true })
    let foot
    if (loop.frameAt) {
      const r = await page.evaluate((a) => window.__render(a), {
        w: loop.w, h: loop.h, look: loop.look ?? 'studio', dir: loop.dir, fill: loop.fill, units: [loop.frameAt],
      })
      foot = r.foot
    }
    for (let i = 0; i < loop.frames; i++) {
      const r = await page.evaluate((a) => window.__render(a), {
        w: loop.w, h: loop.h, look: loop.look ?? 'studio', dir: loop.dir, fill: loop.fill,
        units: [loop.pose(i / loop.frames)], keepCamera: i > 0 || Boolean(loop.frameAt),
      })
      if (i === 0 && !foot) foot = r.foot
      await writeFile(join(dir, `f${String(i).padStart(4, '0')}.png`), Buffer.from(r.png.split(',')[1], 'base64'))
    }
    // The ground is the same for every frame — only the head moves — so it is
    // composed once and the frames are laid over it.
    const ground = join(TMP, 'ground.png')
    await compose(null, ground, { w: loop.w, h: loop.h, ground: loop.ground ?? 'studio', foot })
    const seq = join(dir, 'f%04d.png')
    const graph = '[0][1]overlay=format=auto,format=yuv420p'
    await run('ffmpeg', ['-y', '-loop', '1', '-i', ground, '-framerate', '24', '-i', seq,
      '-filter_complex', graph, '-frames:v', String(loop.frames), '-an',
      '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', join(ROOT, `${loop.out}.webm`)])
    await run('ffmpeg', ['-y', '-loop', '1', '-i', ground, '-framerate', '24', '-i', seq,
      '-filter_complex', graph, '-frames:v', String(loop.frames), '-an',
      '-c:v', 'libx264', '-crf', '25', '-preset', 'slow', '-movflags', '+faststart', join(ROOT, `${loop.out}.mp4`)])
    await compose(join(dir, 'f0000.png'), join(ROOT, `${loop.out}.webp`), { w: loop.w, h: loop.h, ground: loop.ground ?? 'studio', foot })
    manifest.push({ file: `${loop.out.replace(/^public/, '')}.webm`, alt: loop.out, render: true })
    console.log(`  ${loop.out} (${loop.frames} frames)`)
  }

  await writeFile(join(ROOT, 'public/media/render/manifest.json'), JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    source: 'public/models/pebble-v3.glb — the rig the live robot uses',
    note: 'Every entry is a render and is labelled as one on the page.',
    assets: manifest,
  }, null, 2) + '\n')

  await browser.close()
  server.close()
  await rm(TMP, { recursive: true, force: true })
}

main().catch((e) => { console.error(e); process.exit(1) })
