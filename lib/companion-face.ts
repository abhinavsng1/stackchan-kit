/**
 * The face the robot wears, the way its display actually shows it: soft white
 * strokes on the panel's deep blue, the Stack-chan style face the firmware
 * draws. Round eyes that look about, arcs when it is pleased, a short dash on
 * each cheek and a small mouth.
 *
 * Drawn on a 24 x 18 grid of units that fills the 2.0" panel's active area.
 * At the size lib/robot-body.ts uses (384 x 288) a unit is 16 pixels; any
 * other canvas size scales with it.
 *
 * Moods change the shapes, never the palette, so the robot reads as one
 * character whatever it is feeling. The strokes carry their own soft glow,
 * drawn here rather than by a post-process, so the live robot and every
 * render glow the same.
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

/** The panel's lit background, and the strokes drawn on it. */
export const SCREEN = '#0f1f66'
const INK = '#ffffff'

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
 * @param gaze  Where the eyes look, in units: x right, y down, each about -1 to 1.
 */
export function drawCompanion(
  ctx: CanvasRenderingContext2D, mood: FaceMood, t: number,
  speak = 0, gaze: { x: number; y: number } = { x: 0, y: 0 },
): void {
  const w = ctx.canvas.width, h = ctx.canvas.height
  const U = w / COLS
  const oy = (h - ROWS * U) / 2
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = SCREEN
  ctx.fillRect(0, 0, w, h)

  const X = (u: number) => u * U
  const Y = (u: number) => oy + u * U

  // Everything is drawn twice: once blurred for the glow, once crisp on top.
  const ink = (width: number, draw: () => void) => {
    ctx.save()
    ctx.strokeStyle = INK; ctx.fillStyle = INK
    ctx.lineWidth = width * U; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.shadowColor = 'rgba(255,255,255,0.55)'; ctx.shadowBlur = U * 0.8
    draw()
    ctx.shadowBlur = 0
    draw()
    ctx.restore()
  }
  const dot = (x: number, y: number, rx: number, ry = rx) => {
    ctx.beginPath(); ctx.ellipse(X(x), Y(y), rx * U, Math.max(0.01, ry * U), 0, 0, Math.PI * 2); ctx.fill()
  }
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke()
  }
  /** An arc about (x, y); `up` bows upward like ∩, otherwise downward like ∪. */
  const arc = (x: number, y: number, r: number, up: boolean, span = 0.8) => {
    const mid = up ? -Math.PI / 2 : Math.PI / 2, half = Math.PI * span / 2
    ctx.beginPath(); ctx.arc(X(x), Y(y), r * U, mid - half, mid + half); ctx.stroke()
  }
  const ring = (x: number, y: number, r: number) => {
    ctx.beginPath(); ctx.arc(X(x), Y(y), r * U, 0, Math.PI * 2); ctx.stroke()
  }
  const heart = (x: number, y: number, s: number) => {
    ctx.beginPath()
    ctx.moveTo(X(x), Y(y + s * 0.9))
    ctx.bezierCurveTo(X(x - s * 1.4), Y(y - s * 0.1), X(x - s * 0.7), Y(y - s * 1.1), X(x), Y(y - s * 0.35))
    ctx.bezierCurveTo(X(x + s * 0.7), Y(y - s * 1.1), X(x + s * 1.4), Y(y - s * 0.1), X(x), Y(y + s * 0.9))
    ctx.fill()
  }

  const gx = Math.max(-1, Math.min(1, gaze.x)) * 0.9
  const gy = Math.max(-0.6, Math.min(1, gaze.y)) * 0.7
  const blink = blinkAmount(t)
  const id = mood.id
  const happy = id === 'pleased' || id === 'happy'

  // Eyes.
  ink(0.8, () => {
    for (const left of [true, false]) {
      const x = (left ? 7.4 : 16.6) + gx
      const y = 7.4 + gy + (id === 'thinking' ? -0.5 : 0)
      if (happy || (id === 'wink' && !left)) { arc(x, y + 0.9, 1.6, true, 0.85); continue }
      if (id === 'heart') { heart(x, y, 1.5); continue }
      const open = Math.max(0, mood.openness * (1 - blink))
      if (open < 0.12) { arc(x, y - 0.4, 1.35, false, 0.7); continue }
      let r = 1.55
      if (id === 'surprised') r = 1.9
      if (id === 'curious') r = left ? 1.75 : 1.15
      if (id === 'sad' || id === 'angry') r = 1.25
      const ry = r * Math.max(0.18, Math.min(1, open * (id === 'sleepy' ? 1 : 1)))
      dot(x, y + (r - ry) * 0.6, r, ry)
      if (id === 'sad') line(x + (left ? -1.4 : 1.4), y - 2.2, x + (left ? 1.2 : -1.2), y - 2.9)
      if (id === 'angry') line(x + (left ? -1.5 : 1.5), y - 2.9, x + (left ? 1.2 : -1.2), y - 2.0)
      if (id === 'curious' && !left) line(x - 1.2, y - 2.6, x + 1.2, y - 2.9)
    }
  })

  // Cheeks: a short dash under the outer corner of each eye, when it is pleased.
  if (happy || id === 'heart' || id === 'wink' || id === 'awake') {
    ink(0.5, () => { line(5.0 + gx, 10.3 + gy, 6.3 + gx, 10.3 + gy); line(17.7 + gx, 10.3 + gy, 19.0 + gx, 10.3 + gy) })
  }

  // Mouth.
  ink(0.6, () => {
    const mx = 12 + gx * 0.5, my = 11.7 + gy * 0.5
    if (speak > 0.02) {
      dot(mx, my + 0.3, 1.0, 0.25 + speak * 0.85)
    } else if (happy || id === 'heart' || id === 'wink') {
      // An open smile: a half disc, flat side up.
      ctx.beginPath(); ctx.moveTo(X(mx - 1.35), Y(my - 0.2)); ctx.arc(X(mx), Y(my - 0.2), 1.35 * U, 0, Math.PI, false); ctx.closePath(); ctx.fill()
    } else if (mood.mouth === 'frown') {
      arc(mx, my + 1.3, 1.2, true, 0.55)
    } else if (mood.mouth === 'o') {
      ring(mx, my + 0.3, 0.75)
    } else if (mood.mouth === 'smile') {
      arc(mx, my - 0.9, 1.25, false, 0.55)
    } else if (mood.mouth === 'line') {
      line(mx - 0.8 + (id === 'thinking' || id === 'curious' ? 0.6 : 0), my + 0.2, mx + 0.8 + (id === 'thinking' || id === 'curious' ? 0.6 : 0), my + 0.2)
    }
  })

  // A thought bubble over its shoulder, when it is pleased or thinking.
  if (id === 'pleased' || id === 'thinking') {
    ink(0.42, () => {
      ring(20.2, 3.4, 1.35)
      dot(18.35, 5.55, 0.32)
      if (id === 'thinking') { for (const dx of [-0.55, 0, 0.55]) dot(20.2 + dx, 3.4, 0.16) }
      else dot(20.45, 3.15, 0.38)
    })
  }
}
