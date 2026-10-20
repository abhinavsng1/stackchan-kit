import { drawCompanion, moodById } from '@/lib/companion-face'
import type { ScreenDraw } from '@/lib/live-robot'

/**
 * What the robot shows on its screen while it helps: listening, thinking, a
 * timer counting down, the weather. Drawn in the face's own language
 * (lib/companion-face.ts): chunky cells on a 24 x 18 grid, white that glows,
 * one warm colour. A timer in a system font would look like a phone stuck to
 * a robot; this looks like the robot doing it.
 */
const COLS = 24
const ROWS = 18
const WHITE = '#ffffff'
const EMBER = '#ff6a1a'
const RAIN = '#9fd8ff'
const DIM = '#3a3a3a'

function panel(ctx: CanvasRenderingContext2D) {
  const w = ctx.canvas.width, h = ctx.canvas.height
  const C = w / COLS
  const oy = (h - ROWS * C) / 2
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  const cell = (x: number, y: number, cw: number, ch: number) =>
    ctx.fillRect(Math.round(x * C), Math.round(oy + y * C), Math.round(cw * C), Math.round(ch * C))
  // The same soft glow the eyes carry, so a timer lights the screen like a face does.
  const lit = (fill: string, strength: number, draw: () => void) => {
    ctx.save()
    ctx.fillStyle = fill
    ctx.shadowColor = fill === WHITE ? 'rgba(255,255,255,0.55)' : fill
    ctx.shadowBlur = C * 0.9 * strength
    draw()
    ctx.restore()
    ctx.fillStyle = fill
    draw()
  }
  return { cell, lit }
}

/** Digits three cells wide and five tall, the size a face's eye is. */
const GLYPHS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
}

/** Its listening face, eyes turned up toward whoever is talking. */
export const listening = (): ScreenDraw => (ctx, t) =>
  drawCompanion(ctx, moodById('listening'), t, 0, { x: 1, y: -0.5 })

/** Thinking: eyes up and to the side, and three dots taking turns. */
export const thinking = (): ScreenDraw => (ctx, t) => {
  drawCompanion(ctx, moodById('thinking'), t, 0, { x: 0.5, y: -0.5 })
  // Drawn over the face, so no clearing here.
  const C = ctx.canvas.width / COLS
  const oy = (ctx.canvas.height - ROWS * C) / 2
  const on = Math.floor(t / 280) % 3
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === on ? WHITE : DIM
    ctx.fillRect(Math.round((10 + i * 1.5) * C), Math.round(oy + 14.5 * C), Math.round(0.75 * C), Math.round(0.75 * C))
  }
}

/**
 * A timer, counting down for real from the moment it is shown: the minutes
 * and seconds in the face's pixels, and an ember bar that empties as it goes.
 */
export const timer = (minutes: number, startedAt = performance.now()): ScreenDraw => (ctx, t) => {
  const { cell, lit } = panel(ctx)
  const total = minutes * 60_000
  const left = Math.max(0, total - (t - startedAt))
  const secs = Math.ceil(left / 1000)
  const text = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  // Scaled by one and a half: 4:59 is 13 cells at scale one, which leaves the
  // screen looking empty; 19.5 fills it the way a face does.
  const s = 1.5
  const width = [...text].reduce((w, ch, i) => w + (ch === ':' ? 1 : 3) + (i ? 1 : 0), 0) * s
  let x = (COLS - width) / 2
  const y = 3
  let cx = x
  lit(WHITE, 1, () => {
    cx = x
    for (const ch of text) {
      if (ch === ':') {
        // The colon dims and brightens with the seconds, the way a clock's does;
        // gone altogether, 4:57 reads as 4 57.
        if (secs % 2 === 0) { cell(cx, y + 1 * s, s, s); cell(cx, y + 3 * s, s, s) }
        cx += 2 * s
        continue
      }
      GLYPHS[ch].forEach((row, ry) => [...row].forEach((on, rx) => {
        if (on === '1') cell(cx + rx * s, y + ry * s, s, s)
      }))
      cx += 4 * s
    }
  })
  if (secs % 2) {
    const colon = x + (text.indexOf(':') * 4) * s
    ctx.fillStyle = DIM
    cell(colon, y + 1 * s, s, s); cell(colon, y + 3 * s, s, s)
  }
  x = 3
  const bar = 18
  ctx.fillStyle = DIM
  cell(x, 13.5, bar, 0.75)
  lit(EMBER, 0.6, () => cell(x, 13.5, Math.max(0.5, bar * (left / total)), 0.75))
}

/**
 * The weather: rain falling around an umbrella, and its eyes peeking out from
 * underneath it, dry.
 */
export const rain = (): ScreenDraw => (ctx, t) => {
  const { cell, lit } = panel(ctx)
  // Drops on fixed columns at their own pace, so the rain never moves as one sheet.
  const drops = [0.5, 1.5, 2.5, 3.5, 4.5, 19.5, 20.5, 21.5, 22.5, 23, 1, 3, 20, 22, 6, 8, 10, 12.5, 14.5, 16.5, 18]
  ctx.fillStyle = RAIN
  drops.forEach((dx, i) => {
    const speed = 8 + (i % 5)
    const dy = ((t / 1000) * speed + i * 3.1) % 21 - 2.5
    // The umbrella keeps the rain off whatever is under it.
    if (dx >= 4.5 && dx <= 19 && dy > 1.5) return
    cell(dx, dy, 0.4, 1.4)
  })
  lit(EMBER, 0.6, () => {
    cell(10.5, 2, 3, 1)
    cell(8, 3, 8, 1)
    cell(6.5, 4, 11, 1)
    cell(5.5, 5, 13, 1)
    cell(5, 6, 14, 1)
    // A scalloped hem, so it reads as fabric rather than a dome.
    cell(5, 7, 2.5, 0.75); cell(8.75, 7, 2.5, 0.75); cell(12.75, 7, 2.5, 0.75); cell(16.5, 7, 2.5, 0.75)
  })
  lit(WHITE, 0.8, () => {
    // The tip, the handle, and its hook.
    cell(11.75, 1.25, 0.5, 0.75)
    cell(11.75, 7, 0.5, 7)
    cell(12.25, 13.5, 1, 0.5); cell(13, 12.75, 0.5, 0.75)
    // Its eyes, under the umbrella, dry.
    cell(8, 9.5, 1.75, 1.75); cell(14.25, 9.5, 1.75, 1.75)
  })
  lit(EMBER, 0.45, () => { cell(6.75, 11.75, 1, 1); cell(16.25, 11.75, 1, 1) })
  // Where it lands: a puddle either side, rippling.
  ctx.fillStyle = RAIN
  const r = Math.floor(t / 400) % 2
  cell(1 - r * 0.5, 15.5, 3 + r, 0.4); cell(20 - r * 0.5, 15.5, 3 + r, 0.4)
}

/** Pleased with itself, once it has helped. */
export const happy = (): ScreenDraw => (ctx, t) => drawCompanion(ctx, moodById('happy'), t)
