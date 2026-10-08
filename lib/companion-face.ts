/**
 * The face the robot wears on the hero.
 *
 * The firmware's atlas is a cartoon — arcs for eyes, dots for cheeks — which
 * is right on a desk at arm's length and wrong at the size a hero renders it,
 * where it reads as a sticker. This is the same idea drawn for a product shot:
 * a black panel, two luminous eyes, and nothing else.
 *
 * Everything is drawn at the panel's real 320 x 240 so the proportions match
 * the hardware rather than flattering it.
 *
 * It breathes and it blinks, both on slow irregular timers. That matters more
 * than any amount of detail — a face that holds perfectly still reads as a
 * screenshot of a robot, and a face that moves a little reads as something
 * that is on.
 */
export const PANEL = { w: 320, h: 240 }

export type FaceMood = {
  id: string
  name: string
  /** The eyes' colour, and what the glow behind the robot is tinted with. */
  glow: string
  /** How far the eyes narrow at rest: 1 is wide open, 0.45 is content. */
  openness: number
  /** Drawn under the eyes when it has something to say about itself. */
  mouth?: 'none' | 'smile' | 'line'
}

export const MOODS: FaceMood[] = [
  { id: 'awake', name: 'Awake', glow: '#9fe8ff', openness: 1, mouth: 'none' },
  { id: 'listening', name: 'Listening', glow: '#5ce1e6', openness: 0.92, mouth: 'line' },
  { id: 'pleased', name: 'Pleased', glow: '#ffd98a', openness: 0.5, mouth: 'smile' },
  { id: 'thinking', name: 'Thinking', glow: '#b7a6ff', openness: 0.78, mouth: 'none' },
  { id: 'resting', name: 'Resting', glow: '#7f93b8', openness: 0.14, mouth: 'none' },
]

export const moodById = (id: string) => MOODS.find((m) => m.id === id) ?? MOODS[0]

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
 * @param t Milliseconds, from any monotonic clock. Only differences matter.
 */
export function drawCompanion(
  ctx: CanvasRenderingContext2D, mood: FaceMood, t: number,
): void {
  const { w, h } = PANEL
  ctx.clearRect(0, 0, w, h)

  // The panel itself: near-black, with the faintest vertical lift so it reads
  // as glass rather than as a hole cut in the page.
  const ground = ctx.createLinearGradient(0, 0, 0, h)
  ground.addColorStop(0, '#0b0e12')
  ground.addColorStop(1, '#05070a')
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, w, h)

  const breathe = 1 + Math.sin(t / 2600) * 0.035
  const blink = blinkAmount(t)
  const open = Math.max(0.06, mood.openness * (1 - blink)) * breathe

  const eyeW = 46
  const eyeH = 62 * open
  const y = h * 0.47
  const gap = 58

  for (const dx of [-gap, gap]) {
    const x = w / 2 + dx

    // The bloom comes first so the eye sits on top of its own light rather
    // than being washed out by it.
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 74)
    halo.addColorStop(0, `${mood.glow}55`)
    halo.addColorStop(0.45, `${mood.glow}1f`)
    halo.addColorStop(1, 'transparent')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y, 74, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = mood.glow
    roundRect(ctx, x - eyeW / 2, y - eyeH / 2, eyeW, Math.max(3, eyeH), Math.min(eyeW / 2, eyeH / 2))
    ctx.fill()

    // One highlight, high and left on both eyes, as a single light source
    // would actually leave it.
    if (eyeH > 16) {
      ctx.fillStyle = 'rgba(255,255,255,.72)'
      roundRect(ctx, x - eyeW / 2 + 7, y - eyeH / 2 + 7, 13, Math.min(15, eyeH * 0.3), 6)
      ctx.fill()
    }
  }

  if (mood.mouth === 'smile' && blink < 0.5) {
    ctx.strokeStyle = `${mood.glow}cc`
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(w / 2 - 26, y + 56)
    ctx.quadraticCurveTo(w / 2, y + 74, w / 2 + 26, y + 56)
    ctx.stroke()
  } else if (mood.mouth === 'line') {
    ctx.strokeStyle = `${mood.glow}88`
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(w / 2 - 17, y + 60)
    ctx.lineTo(w / 2 + 17, y + 60)
    ctx.stroke()
  }
}

function roundRect(
  c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}
