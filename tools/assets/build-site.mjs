/**
 * The site's renders.
 *
 *   node tools/assets/build-body.mjs     # the model, once, if the STL changed
 *   node tools/assets/build-site.mjs     # every still and loop
 *   node tools/assets/build-site.mjs --stills | --loops
 *
 * Every shot is the robot from lib/robot-body.ts — the same body, finish and
 * studio the live hero uses — so the renders and the robot on the page agree
 * on everything. Each one is a render and is labelled as one wherever it
 * appears.
 *
 * The stage page does all the finishing (ground, shadow, reflection, WebP,
 * WebM and MP4 through WebCodecs), so this needs Google Chrome and nothing
 * else: no ImageMagick, no ffmpeg. Chrome rather than Playwright's Chromium
 * because only Chrome ships an H.264 encoder.
 *
 * Coordinates: the robot faces +Z, Y is up. `dir` is where the camera sits,
 * seen from the robot. Pan is degrees about Y, positive turning the face
 * toward +X; tilt is degrees up, and the real hinge stops at level, so it is
 * never negative.
 */
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, readdir, utimes } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const ROOT = fileURLToPath(new URL('../..', import.meta.url))

// The face, the body and the colourways are compiled from lib/ first, so the
// renders read the same definitions as the site.
await run(join(ROOT, 'node_modules/.bin/tsc'), ['lib/companion-face.ts', 'lib/robot-body.ts', 'lib/shells.ts', 'lib/talk-script.ts', 'lib/screen-scenes.ts', '--ignoreConfig',
  '--target', 'es2020', '--module', 'es2020', '--moduleResolution', 'bundler', '--outDir', 'tools/assets/.gen', '--skipLibCheck'], { cwd: ROOT })
const { SHELLS } = await import('./.gen/shells.js')
const SHELL = Object.fromEntries(SHELLS.map((s) => [s.id, s]))
const { SCRIPT, SPEAKING, CHAT_LOOP } = await import('./.gen/talk-script.js')

/** The live hero's own camera (lib/live-robot.ts VIEW): front three-quarter from the speaker side. */
const az = 26 * Math.PI / 180, el = 10 * Math.PI / 180
const HERO = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]

const SHOTS = [
  // The hero's stand-in and the colour picker: one per shell, on the page's
  // own background, framed exactly as the live robot is.
  ...Object.keys(SHELL).map((id) => ({
    out: `public/media/shots/float-shell-${id}.webp`, ground: 'float', w: 1400, h: 1400,
    dir: HERO, fill: 1.08, aim: [0, -2, 0], units: [{ shell: SHELL[id], mood: 'awake', pan: 8, tilt: 4 }],
    alt: `PebbleRobo in ${SHELL[id].name}`,
  })),
  // Talk to it: low, looking up at you, listening.
  {
    out: 'public/media/render/role-answers', widths: [1600, 800], ground: 'stage', w: 1600, h: 1200,
    dir: [0.5, 0.12, 0.86], fill: 0.95,
    units: [{ shell: SHELL.signal, mood: 'listening', pan: -4, tilt: 10, gaze: { x: 0.5, y: -0.5 } }],
    alt: 'PebbleRobo in Signal, looking up, listening',
  },
  // A performer: head turned mid-line, pleased with itself.
  {
    out: 'public/media/render/role-performer', widths: [1600, 800], ground: 'stage', w: 1600, h: 1000,
    dir: [-0.6, 0.16, 0.78], fill: 1.0,
    units: [{ shell: SHELL.ember, mood: 'pleased', pan: -30, tilt: 6 }],
    alt: 'PebbleRobo in Ember, head turned, smiling',
  },
  // A puppet: turned to follow someone off to the side.
  {
    out: 'public/media/render/role-puppet', widths: [1600, 800], ground: 'stage', w: 1600, h: 1000,
    dir: [0.9, 0.1, 0.42], fill: 1.0,
    units: [{ shell: SHELL.moss, mood: 'awake', pan: 36, tilt: 2, gaze: { x: 1, y: 0 } }],
    alt: 'PebbleRobo in Moss, turning its head',
  },
  // A pet: from above, dozing.
  {
    out: 'public/media/render/role-pet', widths: [1600, 800], ground: 'studio', w: 1600, h: 1200,
    dir: [0.4, 0.62, 0.68], fill: 1.0,
    units: [{ shell: SHELL.moss, mood: 'resting', pan: -6, tilt: 0 }],
    alt: 'PebbleRobo in Moss, seen from above, resting',
  },
  // What's inside: the stack pulled apart, servos out to the sides.
  {
    out: 'public/media/render/role-yours', widths: [1600, 800], ground: 'studio', w: 1200, h: 1500,
    dir: [0.62, 0.3, 0.72], fill: 0.95,
    units: [{ shell: SHELL.ember, mood: 'thinking', pan: -8, tilt: 0, explode: 0.6 }],
    alt: 'PebbleRobo pulled apart: base, neck with both servos, head and controller',
  },
  // Meet it: the live turntable's first frame (lib/live-turntable.ts), its stand-in.
  {
    out: 'public/media/render/meet-face.webp', ground: 'studio', w: 1080, h: 1350,
    dir: [0, Math.sin(12 * Math.PI / 180), Math.cos(12 * Math.PI / 180)], fit: 'sweep', margin: 0.9,
    units: [{ shell: SHELL.ember, mood: 'pleased', yaw: 28, pan: 0, tilt: 4 }],
    alt: 'PebbleRobo in Ember, smiling, on a turntable',
  },
  // The buy gallery: five angles on one robot.
  ...[
    ['hero', [0.55, 0.2, 0.82], 'awake', 8, 4],
    ['front', [0, 0.1, 1], 'pleased', 0, 2],
    ['right', [-0.62, 0.14, 0.8], 'pleased', -14, 2],
    ['profile', [1, 0.1, 0.12], 'awake', 26, 0],
    ['high', [0.4, 0.55, 0.72], 'listening', 6, 8],
  ].map(([name, dir, mood, pan, tilt]) => ({
    out: `public/media/render/gallery-${name}.webp`, ground: 'studio', w: 1080, h: 1350,
    dir, fill: 0.9, units: [{ shell: SHELL.ember, mood, pan, tilt }],
    alt: `PebbleRobo in Ember, ${{ hero: 'three-quarter', front: 'front', right: 'from the right', profile: 'in profile', high: 'from above' }[name]} view`,
  })),
  // All five in a shallow arc, each facing the middle: the live lineup's
  // stand-in (lib/live-lineup.ts ARC and VIEW), so the two match.
  {
    out: 'public/media/render/lineup', widths: [2400, 1200], ground: 'studio', w: 2400, h: 1000,
    dir: [Math.sin(6 * Math.PI / 180) * Math.cos(15 * Math.PI / 180), Math.sin(15 * Math.PI / 180), Math.cos(6 * Math.PI / 180) * Math.cos(15 * Math.PI / 180)],
    fit: 'box', margin: 0.96,
    units: ['graphite', 'bone', 'ember', 'signal', 'moss'].map((id, i) => {
      const a = (i - 2) * 16.5 * Math.PI / 180
      return {
        shell: SHELL[id], mood: ['pleased', 'awake', 'listening', 'pleased', 'awake'][i],
        x: 300 * Math.sin(a), z: 300 * (1 - Math.cos(a)), yaw: -a * 180 / Math.PI, pan: 0, tilt: 6,
      }
    }),
    alt: 'Five PebbleRobos standing in an arc, one in each shell colour, all looking the same way',
  },
  // The same five, closed up and staggered for a phone (lib/live-lineup.ts
  // ARC_COMPACT, VIEW_COMPACT): the live lineup's stand-in below 640 px.
  {
    out: 'public/media/render/lineup-compact', widths: [1600], ground: 'studio', w: 1600, h: 900,
    dir: [0, Math.sin(14 * Math.PI / 180), Math.cos(14 * Math.PI / 180)], fit: 'box', margin: 0.99,
    units: ['graphite', 'bone', 'ember', 'signal', 'moss'].map((id, i) => {
      const a = (i - 2) * 10.5 * Math.PI / 180
      return {
        shell: SHELL[id], mood: ['pleased', 'awake', 'listening', 'pleased', 'awake'][i],
        x: 300 * Math.sin(a), z: 300 * (1 - Math.cos(a)) + (i % 2 === 0 ? 30 : -30), yaw: -a * 180 / Math.PI, pan: 0, tilt: 6,
      }
    }),
    alt: 'Five PebbleRobos standing close together, one in each shell colour',
  },
]

/**
 * Loops: the same robot doing what each section talks about, rendered frame
 * by frame from the rig, inside the real range of the real servos. `pose(p)`
 * gets the loop's progress, 0 to 1, and must end where it started.
 */
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * x)
/** Speech, as a mouth: syllables inside words, words inside a phrase. */
const speech = (t) => Math.max(0, Math.sin(Math.PI * 2 * 6.5 * t)) * (0.45 + 0.55 * Math.max(0, Math.sin(Math.PI * 2 * 1.4 * t)))
/** Smoothstep from a to b over [t0, t1]. */
const between = (p, t0, t1, a, b) => {
  const x = Math.min(1, Math.max(0, (p - t0) / (t1 - t0)))
  return a + (b - a) * x * x * (3 - 2 * x)
}
const up = (t) => Math.max(0, t)

const LOOPS = [
  {
    // A video call: someone's face on its screen, talking, while the robot
    // listens with small nods and leans in. Square on, so the call reads.
    out: 'public/media/render/loop-videocall', w: 1200, h: 900, frames: 168,
    dir: [0.28, 0.1, 0.96], fill: 0.8,
    pose: (p) => {
      const talking = (p > 0.06 && p < 0.42) || (p > 0.56 && p < 0.92)
      return {
        shell: SHELL.signal, screen: 'caller', clock: 4000 + p * 7000,
        talk: talking ? speech(p * 7) : 0,
        pan: 8 + 3 * Math.sin(Math.PI * 2 * p),
        tilt: up(8 + (p > 0.44 && p < 0.56 ? 6 * Math.sin(Math.PI * (p - 0.44) / 0.12) : 0)),
      }
    },
  },
  {
    // A dance: swaying side to side, bobbing on the beat, grinning, with
    // music notes drifting up its screen. Four bars, then round again.
    out: 'public/media/render/loop-dance', w: 1200, h: 900, frames: 192,
    dir: [0.45, 0.12, 0.89], fill: 0.84,
    frameAt: { shell: SHELL.ember, mood: 'happy', pan: 30, tilt: 14 },
    pose: (p) => {
      const beat = p * 16
      return {
        shell: SHELL.ember, mood: p > 0.5 && p < 0.56 ? 'surprised' : 'happy', clock: 600 + p * 200,
        notes: beat,
        pan: 28 * Math.sin(Math.PI * 2 * p * 2),
        tilt: up(6 + 8 * Math.abs(Math.sin(Math.PI * beat))),
      }
    },
  },
  {
    // What's inside: assembled, then apart — base, neck and its servos, head,
    // the Lite — held long enough to see each part, then back together.
    out: 'public/media/render/loop-inside', w: 896, h: 1120, frames: 168, dir: [0.6, 0.26, 0.76], fill: 0.98,
    // Framed on the fully exploded pose, so nothing leaves the frame.
    frameAt: { shell: SHELL.ember, mood: 'thinking', explode: 1, pan: -10 },
    pose: (p) => {
      const e = between(p, 0.14, 0.38, 0, 1) - between(p, 0.72, 0.94, 0, 1)
      return { shell: SHELL.ember, mood: e > 0.5 ? 'thinking' : 'awake', clock: p * 7000,
        explode: e, pan: -10 + 8 * Math.sin(Math.PI * 2 * p), tilt: 0 }
    },
  },
  {
    // Say its name: looking elsewhere, it notices you, looks up and listens,
    // then answers — mouth moving, small nods — and drifts back.
    out: 'public/media/render/loop-talk', w: 1200, h: 900, frames: 168, ground: 'stage',
    dir: [0.5, 0.12, 0.86], fill: 0.95,
    pose: (p) => {
      const turn = between(p, 0.12, 0.24, 0, 1) - between(p, 0.86, 0.98, 0, 1)
      const talking = p > 0.42 && p < 0.84
      return {
        shell: SHELL.signal, clock: 1000 + p * 7000,
        mood: p < 0.12 || p > 0.9 ? 'awake' : talking ? 'awake' : 'listening',
        // From this camera, negative pan looks away and positive turns to you.
        pan: -24 * (1 - turn) + 14 * turn,
        tilt: up(2 + 10 * turn + (talking ? 3 * Math.sin(Math.PI * 2 * 3 * p) : 0)),
        gaze: { x: -1 * (1 - turn) + 0.5 * turn, y: -0.5 * turn },
        speak: talking ? speech((p - 0.42) * 7) : 0,
      }
    },
  },
  {
    // A performer: swaying through a line, bobbing on the beat.
    out: 'public/media/render/loop-performer', w: 1280, h: 800, frames: 120, ground: 'stage',
    dir: [-0.6, 0.16, 0.78], fill: 1.0,
    pose: (p) => ({
      shell: SHELL.ember, mood: 'pleased', clock: 900 + p * 3200,
      pan: -24 * Math.sin(Math.PI * 2 * p), tilt: up(4 + 5 * Math.sin(Math.PI * 2 * 4 * p)),
      speak: p < 0.8 ? speech(p * 5) : 0,
    }),
  },
  {
    // A puppet: holding still, then turning and tilting the way you do.
    out: 'public/media/render/loop-puppet', w: 1280, h: 800, frames: 120, ground: 'stage',
    dir: [0.9, 0.1, 0.42], fill: 1.0,
    pose: (p) => ({
      shell: SHELL.moss, mood: 'awake', clock: 2000 + p * 5000,
      pan: 36 + between(p, 0.1, 0.25, 0, -30) + between(p, 0.45, 0.6, 0, 52) + between(p, 0.8, 0.95, 0, -22),
      tilt: 2 + between(p, 0.1, 0.25, 0, 8) + between(p, 0.45, 0.6, 0, 10) - between(p, 0.8, 0.95, 0, 18),
      gaze: { x: 1 + between(p, 0.1, 0.25, 0, -1) + between(p, 0.45, 0.6, 0, 1) - between(p, 0.8, 0.95, 0, 1), y: 0 },
    }),
  },
  {
    out: 'public/media/render/loop-alive', w: 720, h: 900, frames: 120, dir: [0.42, 0.12, 0.9], fill: 0.86,
    // Breathing, a blink, and the smallest sway: alive while doing nothing.
    pose: (p) => ({ shell: SHELL.ember, mood: 'awake', clock: 2600 + p * 5000,
      pan: 6 + Math.sin(Math.PI * 2 * p) * 3, tilt: 3 + Math.sin(Math.PI * 4 * p) * 1.2 }),
  },
  {
    out: 'public/media/render/loop-look', w: 720, h: 900, frames: 144, dir: [0.2, 0.12, 1], fill: 0.86,
    // A glance one way, then the other; the eyes lead the head.
    pose: (p) => ({ shell: SHELL.ember, mood: 'awake', clock: p * 6000,
      pan: Math.sin(Math.PI * 2 * p) * 38, tilt: 3 + Math.sin(Math.PI * 4 * p) * 3,
      gaze: { x: Math.sin(Math.PI * 2 * p + 0.5) * 1, y: 0 } }),
  },
  {
    out: 'public/media/render/loop-nod', w: 720, h: 900, frames: 120, dir: [0.5, 0.1, 0.86], fill: 0.86,
    // Two nods, a pause, and back. It rests looking a little up, so a nod
    // comes down to level, which is as far as the hinge goes.
    pose: (p) => ({ shell: SHELL.ember, mood: 'pleased', clock: 900 + p * 3000,
      pan: 8, tilt: 10 - (p < 0.7 ? 10 * up(Math.sin(Math.PI * 2 * (p / 0.35))) * (1 - ease(p / 0.7) * 0.2) : 0) }),
  },
  {
    // The phone's "Talk to it": the whole exchange in one loop, timed to
    // lib/talk-script.ts so the conversation laid over it lands on cue. It
    // is looking elsewhere, hears its name, turns and looks up, answers;
    // listens, glances at what you hold, answers again, and drifts back.
    // Framed high in a portrait card, leaving the lower half for the chat.
    out: 'public/media/render/loop-chat', w: 720, h: 900, frames: CHAT_LOOP * 24, ground: 'stage',
    dir: [0.42, 0.14, 0.9], fill: 1.14, aim: [0, -30, 0],
    pose: (p) => {
      const t = p * CHAT_LOOP
      const heard = SCRIPT[0].at, asked = SCRIPT[3].at, looks = SCRIPT[4].at
      const turn = between(t, heard + 0.3, heard + 1.1, 0, 1) - between(t, CHAT_LOOP - 1.4, CHAT_LOOP - 0.3, 0, 1)
      const atHand = between(t, looks - 0.1, looks + 0.5, 0, 1) - between(t, SPEAKING[1][0] - 0.6, SPEAKING[1][0], 0, 1)
      const curious = between(t, asked, asked + 0.4, 0, 1) - between(t, looks - 0.1, looks + 0.3, 0, 1)
      const speaking = SPEAKING.findIndex(([a, b]) => t > a && t < b)
      let mood = 'awake'
      if ((t > heard + 0.3 && t < SPEAKING[0][0]) || (t > asked && t < looks)) mood = 'listening'
      if (atHand > 0.5) mood = 'thinking'
      if (t >= SPEAKING[1][0] && t < CHAT_LOOP - 1.4) mood = 'pleased'
      return {
        shell: SHELL.signal, mood, clock: 1000 + t * 1000,
        // From this camera, negative pan looks away and positive turns to you.
        pan: -24 * (1 - turn) + 12 * turn - 14 * atHand,
        tilt: up(2 + 10 * turn - 9 * atHand + 4 * curious + (speaking >= 0 ? 2.5 * Math.sin(Math.PI * 3 * t) : 0)),
        gaze: { x: -1 * (1 - turn) + 0.4 * turn - 0.6 * atHand, y: -0.5 * turn * (1 - atHand) + atHand },
        speak: speaking >= 0 ? speech(t - SPEAKING[speaking][0]) : 0,
      }
    },
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
  // localhost, not an IP: WebCodecs needs a secure context.
  return new Promise((r) => server.listen(0, 'localhost', () => r({ server, port: server.address().port })))
}

const dataUrl = (s) => Buffer.from(s.split(',')[1], 'base64')

async function main() {
  const { server, port } = await serve()
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
  })
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  page.on('pageerror', (e) => console.error('  page error:', String(e).slice(0, 300)))
  page.on('console', (m) => { if (m.type() === 'error') console.error('  console:', m.text().slice(0, 300)) })
  await page.goto(`http://localhost:${port}/tools/assets/stage-site.html`)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 })

  const manifestFile = join(ROOT, 'public/media/render/manifest.json')
  const previous = existsSync(manifestFile) ? JSON.parse(await readFile(manifestFile, 'utf8')).assets : []
  const manifest = new Map(previous.map((a) => [a.file, a]))

  const stills = !process.argv.includes('--loops')
  const loops = !process.argv.includes('--stills')
  // --only <text>: just the shots and loops whose output path contains it.
  const onlyAt = process.argv.indexOf('--only')
  const only = onlyAt >= 0 ? process.argv[onlyAt + 1] : null
  const wanted = (x) => !only || x.out.includes(only)

  for (const shot of stills ? SHOTS.filter(wanted) : []) {
    const { out, alt, ...spec } = shot
    const urls = await page.evaluate((s) => window.__still(s), spec)
    const files = shot.widths ? shot.widths.map((wd) => `${out}@${wd}.webp`) : [out]
    for (let i = 0; i < files.length; i++) {
      await writeFile(join(ROOT, files[i]), dataUrl(urls[i]))
      manifest.set(files[i].replace(/^public/, ''), { file: files[i].replace(/^public/, ''), alt, render: true })
    }
    console.log(`  ${out}`)
  }

  for (const loop of loops ? LOOPS.filter(wanted) : []) {
    const { out, pose, frameAt, frames, ...spec } = loop
    const list = Array.from({ length: frames }, (_, i) => [pose(i / frames)])
    // frameAt: frame the camera on the widest pose, then hold it for every frame.
    const r = await page.evaluate((l) => window.__loop(l), {
      ...spec, ground: spec.ground ?? 'studio', frames: list, frameAt: frameAt ? [frameAt] : null,
    })
    await writeFile(join(ROOT, `${out}.webm`), Buffer.from(r.webm, 'base64'))
    await writeFile(join(ROOT, `${out}.mp4`), Buffer.from(r.mp4, 'base64'))
    await writeFile(join(ROOT, `${out}.webp`), dataUrl(r.poster))
    const key = `${out.replace(/^public/, '')}.webm`
    manifest.set(key, { file: key, alt: out, render: true })
    console.log(`  ${out} (${frames} frames, webm ${(r.webm.length * 0.75 / 1024).toFixed(0)} KB, mp4 ${(r.mp4.length * 0.75 / 1024).toFixed(0)} KB)`)
  }

  await writeFile(manifestFile, JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    source: 'public/models/stackchan-body.glb + lib/robot-body.ts — the robot the live hero uses',
    note: 'Every entry is a render and is labelled as one on the page.',
    assets: [...manifest.values()],
  }, null, 2) + '\n')

  // The version stamp: a hash of every render, so a page that shows one
  // through next/image asks for a new URL exactly when it changed
  // (lib/renders.ts, next.config.ts).
  const hash = createHash('sha1')
  for (const dir of ['public/media/render', 'public/media/shots']) {
    for (const name of (await readdir(join(ROOT, dir))).sort()) hash.update(name).update(await readFile(join(ROOT, dir, name)))
  }
  const v = hash.digest('hex').slice(0, 10)
  await writeFile(join(ROOT, 'lib/render-version.json'), JSON.stringify({ v }) + '\n')
  console.log(`  render version ${v}`)
  // next.config.ts allows exactly this stamp and reads it at startup; touching
  // it makes a running `next dev` reload, so the new URLs are accepted.
  const now = new Date()
  await utimes(join(ROOT, 'next.config.ts'), now, now)

  await browser.close()
  server.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
