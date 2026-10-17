/**
 * The face the robot wears: chunky pixels on a black panel, the way the
 * display actually shows it.
 *
 * Drawn on a 24 x 18 grid of cells that fills the 2.0" panel's active area.
 * At the size lib/robot-body.ts uses (384 x 288) a cell is exactly 16 pixels,
 * so every edge lands on a pixel and the texture can be sampled nearest-
 * neighbour without shimmering. Any other canvas size scales the grid.
 *
 * Two white eyes, a warm pixel on each cheek and a small mouth. Moods change
 * the shapes, never the palette, so the robot reads as one character whatever
 * it is feeling. The eyes carry their own soft glow, drawn here rather than
 * by a post-process, so the live robot and every render glow the same.
 *
 * It blinks on slow irregular timers. A face that holds perfectly still reads
 * as a screenshot of a robot; one that blinks reads as something that is on.
 */
export const PANEL = { w: 384, h: 288 }

/** The grid the face is drawn on. */
const COLS = 24
const ROWS = 18

export type FaceMood = {
  id: string
  name: string
  /** A tint associated with the mood, for anything around the robot that wants one. */
  glow: string
  /** How far the eyes are open at rest: 1 is wide open, 0 is shut. */
  openness: number
  /** Drawn under the eyes when it has something to say about itself. */
  mouth?: 'none' | 'smile' | 'line' | 'frown' | 'o'
  /**
   * A face someone made rather than one it ships with — shown in the site's
   * "make it yours" preview, never cycled through as one of its own moods.
   */
  custom?: true
}

export const MOODS: FaceMood[] = [
  { id: 'awake', name: 'Awake', glow: '#ffffff', openness: 1, mouth: 'smile' },
  { id: 'listening', name: 'Listening', glow: '#9fe8ff', openness: 1, mouth: 'line' },
  { id: 'pleased', name: 'Pleased', glow: '#ffd98a', openness: 1, mouth: 'smile' },
  { id: 'thinking', name: 'Thinking', glow: '#b7a6ff', openness: 0.75, mouth: 'line' },
  { id: 'resting', name: 'Resting', glow: '#7f93b8', openness: 0, mouth: 'none' },
  { id: 'happy', name: 'Happy', glow: '#ffd98a', openness: 1, mouth: 'smile' },
  { id: 'sad', name: 'Sad', glow: '#8fb4ff', openness: 0.75, mouth: 'frown' },
  { id: 'angry', name: 'Angry', glow: '#ff8a6a', openness: 0.75, mouth: 'frown' },
  { id: 'surprised', name: 'Surprised', glow: '#ffffff', openness: 1, mouth: 'o' },
  { id: 'curious', name: 'Curious', glow: '#9fe8ff', openness: 1, mouth: 'line' },
  { id: 'sleepy', name: 'Sleepy', glow: '#7f93b8', openness: 0.3, mouth: 'none' },
  // Made, not shipped: what a custom face can look like.
  { id: 'heart', name: 'Hearts', glow: '#ff7aa8', openness: 1, mouth: 'smile', custom: true },
  { id: 'wink', name: 'Wink', glow: '#ffd98a', openness: 1, mouth: 'smile', custom: true },
]

/** The faces it ships with, in the order the live robot cycles them on a tap. */
export const OWN_MOODS = MOODS.filter((m) => !m.custom)

export const moodById = (id: string) => MOODS.find((m) => m.id === id) ?? MOODS[0]

const EYE = '#ffffff'
const CHEEK = '#ff6a1a'

/** A blink every few seconds, never on a metronome. */
function blinkAmount(t: number): number {
  // Two primes, so the pattern does not repeat on any interval a viewer can
  // feel. A blink on a strict timer is the thing that reads as mechanical.
  const phase = (t / 1000) % 5.3
  const second = (t / 1000) % 8.9
  const close = (p: number, at: number) => {
    const d = Math.abs(p - at)
    return d < 0.09 ? 1 - d / 0.09 : 0
  }
  return Math.min(1, close(phase, 4.2) + close(second, 7.1))
}

/**
 * Draw the face.
 *
 * @param t     Milliseconds, from any monotonic clock. Only differences matter.
 * @param speak How far the mouth is open while it speaks, 0 to 1. 0 draws the mood's own mouth.
 * @param gaze  Where the eyes look, in cells: x right, y down, each about -1 to 1.
 */
export function drawCompanion(
  ctx: CanvasRenderingContext2D, mood: FaceMood, t: number,
  speak = 0, gaze: { x: number; y: number } = { x: 0, y: 0 },
): void {
  const w = ctx.canvas.width, h = ctx.canvas.height
  const C = w / COLS
  const oy = (h - ROWS * C) / 2
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)

  // Cells snap to half a cell, so movement steps like pixel art.
  const snap = (v: number) => Math.round(v * 2) / 2
  const cell = (x: number, y: number, cw: number, ch: number) =>
    ctx.fillRect(Math.round(x * C), Math.round(oy + y * C), Math.round(cw * C), Math.round(ch * C))

  const glow = (fill: string, strength: number, draw: () => void) => {
    ctx.save()
    ctx.fillStyle = fill
    ctx.shadowColor = fill === EYE ? 'rgba(255,255,255,0.55)' : fill
    ctx.shadowBlur = C * 0.9 * strength
    draw()
    ctx.restore()
    ctx.fillStyle = fill
    draw()
  }

  const ex = snap(Math.max(-1, Math.min(1, gaze.x)))
  const ey = snap(Math.max(-0.5, Math.min(1, gaze.y)))
  const blink = blinkAmount(t)

  glow(EYE, 1, () => {
    for (const bx of [6, 15]) {
      const left = bx === 6
      const x = bx + ex
      const y = 5 + ey + (mood.id === 'thinking' ? -0.5 : 0)
      if (mood.id === 'pleased' || mood.id === 'happy') {
        // Happy: an upturned V.
        cell(x, y + 2, 1, 1); cell(x + 1, y + 1, 1, 1); cell(x + 2, y + 2, 1, 1)
        cell(x + 0.5, y + 1.5, 2, 0.5)
        continue
      }
      if (mood.id === 'heart') {
        // A pixel heart.
        cell(x - 0.5, y + 0.5, 1.5, 1.5); cell(x + 2, y + 0.5, 1.5, 1.5)
        cell(x - 0.5, y + 1.5, 4, 1); cell(x, y + 2.5, 3, 1); cell(x + 1, y + 3.5, 1, 0.5)
        continue
      }
      if (mood.id === 'wink' && !left) {
        cell(x, y + 2, 3, 0.5); cell(x + 2.5, y + 1.5, 0.5, 0.5)
        continue
      }
      const open = Math.max(0, mood.openness * (1 - blink))
      if (open < 0.12) {
        // Shut: a line along the bottom of where the eye would be.
        cell(x, y + 3.5, 3, 0.5)
        continue
      }
      if (mood.id === 'surprised') {
        // Wide and round: taller, with the corners cut.
        cell(x + 0.5, y - 1, 2, 6); cell(x, y - 0.5, 3, 5)
        continue
      }
      if (mood.id === 'curious') {
        // One eye wider than the other, the head-tilt of a face.
        const eh = left ? 5 : 3
        cell(x, y + (4 - eh) / 2, 3, eh)
        if (!left) cell(x, y - 1, 3, 0.5)
        continue
      }
      const eh = Math.max(0.5, snap(4 * open))
      const ty = y + (4 - eh) / 2
      cell(x, ty, 3, eh)
      if (mood.id === 'sad') {
        // Brows up at the inner corners.
        if (left) { cell(x + 2, ty - 1.5, 1, 0.5); cell(x + 1, ty - 1, 1, 0.5); cell(x, ty - 0.5, 1, 0.5) }
        else { cell(x, ty - 1.5, 1, 0.5); cell(x + 1, ty - 1, 1, 0.5); cell(x + 2, ty - 0.5, 1, 0.5) }
      } else if (mood.id === 'angry') {
        // Brows down at the inner corners, cutting into the eye.
        if (left) { cell(x, ty - 1.5, 1, 0.5); cell(x + 1, ty - 1, 1, 0.5); cell(x + 2, ty - 0.5, 1, 0.5) }
        else { cell(x + 2, ty - 1.5, 1, 0.5); cell(x + 1, ty - 1, 1, 0.5); cell(x, ty - 0.5, 1, 0.5) }
      }
    }
  })

  // Cheeks: one warm pixel under the outer corner of each eye.
  glow(CHEEK, 0.45, () => { cell(5, 9, 1, 1); cell(18, 9, 1, 1) })

  glow(EYE, 0.8, () => {
    if (speak > 0.02) {
      // Mid-word: an opening that grows with the sound.
      const mh = snap(0.5 + speak * 1.5)
      cell(11, 11, 2, mh)
      cell(10.5, 11 + Math.max(0, mh - 0.5) / 2, 0.5, 0.5)
      cell(13, 11 + Math.max(0, mh - 0.5) / 2, 0.5, 0.5)
    } else if (mood.id === 'pleased' || mood.id === 'happy' || mood.id === 'heart') {
      cell(9, 11, 1, 1); cell(10, 12, 4, 1); cell(14, 11, 1, 1)
    } else if (mood.mouth === 'frown') {
      cell(10, 12, 1, 1); cell(11, 11, 2, 1); cell(13, 12, 1, 1)
    } else if (mood.mouth === 'o') {
      cell(11, 11, 2, 0.5); cell(11, 12.5, 2, 0.5); cell(10.5, 11.5, 0.5, 1); cell(13, 11.5, 0.5, 1)
    } else if (mood.mouth === 'smile') {
      cell(10, 11, 1, 1); cell(11, 12, 2, 1); cell(13, 11, 1, 1)
    } else if (mood.mouth === 'line') {
      cell(mood.id === 'thinking' || mood.id === 'curious' ? 12 : 11, 12, 2, 0.5)
    } else {
      cell(11.5, 12, 1, 0.5)
    }
  })
}
