import { SCREEN, byId } from '@/lib/faces'

/**
 * The robot's screen, drawn live.
 *
 * The earlier version cached an SVG per mode per frame, which is fine for a
 * loop but cannot show anything real: a microphone level or a camera frame
 * changes every tick, and allocating a texture per tick leaks GPU memory until
 * the tab dies. So the panel is a 2D canvas redrawn in place, and three.js
 * uploads the same buffer each frame.
 *
 * That is what makes the demo honest. When someone selects "it talks and
 * listens", those bars are their own voice through their own microphone —
 * not an animation of what a microphone might look like.
 *
 * Everything is drawn at 320 × 240, the panel's real resolution, because that
 * is the constraint the firmware works within and a demo at a flattering
 * resolution would be a different product.
 */

export const W = SCREEN.w
export const H = SCREEN.h

export type PanelMode = 'face' | 'see' | 'hear' | 'touch' | 'online' | 'game'

export type Ripple = { x: number; y: number; born: number }

export type PanelState = {
  mode: PanelMode
  faceId: string
  /** 0–1 per band, straight from an AnalyserNode. Empty when not listening. */
  levels: Float32Array | null
  /** The visitor's camera, when they have allowed it. */
  video: HTMLVideoElement | null
  ripples: Ripple[]
  /** Set while a getUserMedia prompt is outstanding or was refused. */
  notice: string | null
  wifiAt: number
  game: GameState | null
}

const CYAN = '#6ee7d7'
const GREEN = '#3ddc84'
const DIM = 'rgba(110,231,215,.28)'

function ground(c: CanvasRenderingContext2D, fill = '#0d1a1c') {
  c.fillStyle = fill
  c.fillRect(0, 0, W, H)
}

function status(c: CanvasRenderingContext2D, text: string, colour = CYAN) {
  c.font = '13px ui-monospace, monospace'
  c.fillStyle = colour
  c.globalAlpha = 0.85
  // 22, not 10: at the camera angle the model is shown from, the shell's own
  // side wall occludes the first few millimetres of the panel.
  c.fillText(text, 22, H - 10)
  c.globalAlpha = 1
}

function notice(c: CanvasRenderingContext2D, text: string) {
  c.font = '13px ui-monospace, monospace'
  c.fillStyle = CYAN
  c.textAlign = 'center'
  for (const [i, line] of wrapText(text, 30).entries()) {
    c.fillText(line, W / 2, H / 2 - 6 + i * 18)
  }
  c.textAlign = 'left'
}

function wrapText(s: string, max: number) {
  const out: string[] = []
  let line = ''
  for (const word of s.split(' ')) {
    if ((line + ' ' + word).trim().length > max) { out.push(line.trim()); line = word }
    else line += ' ' + word
  }
  if (line.trim()) out.push(line.trim())
  return out
}

/* ------------------------------- modes ------------------------------- */

function drawFace(c: CanvasRenderingContext2D, faceId: string, t: number) {
  const f = byId(faceId)
  ground(c, f.bg)
  // The eyes, drawn from the same geometry the SVG atlas uses.
  const blink = Math.sin(t / 1400) > 0.985 && f.blinks
  const ry = blink ? 2 : 26
  c.fillStyle = f.eye
  for (const x of [104, 216]) {
    c.beginPath(); c.ellipse(x, 100, 26, ry, 0, 0, Math.PI * 2); c.fill()
  }
  c.strokeStyle = f.eye
  c.lineWidth = 6
  c.lineCap = 'round'
  c.beginPath(); c.moveTo(142, 172); c.quadraticCurveTo(160, 188, 178, 172); c.stroke()
  status(c, `ARMED  ${f.name.toUpperCase()}`, f.acc)
}

function drawSee(c: CanvasRenderingContext2D, s: PanelState, t: number) {
  ground(c, '#0d1a1c')
  if (s.video && s.video.readyState >= 2) {
    // Cover-fit the webcam into the panel, mirrored, as a front camera is.
    const vw = s.video.videoWidth || 640
    const vh = s.video.videoHeight || 480
    const scale = Math.max(W / vw, H / vh)
    const dw = vw * scale, dh = vh * scale
    c.save()
    c.translate(W, 0); c.scale(-1, 1)
    c.drawImage(s.video, (W - dw) / 2, (H - dh) / 2, dw, dh)
    c.restore()
    // Not face detection — a fixed reticle over the centre, labelled as such.
    const bx = 108, by = 62, bw = 104, bh = 104
    c.strokeStyle = GREEN; c.lineWidth = 3
    c.strokeRect(bx, by, bw, bh)
    status(c, 'CAM  LIVE', GREEN)
  } else {
    notice(c, s.notice ?? 'Allow the camera to see yourself here')
    status(c, 'CAM  GC0308')
  }
  // Registration brackets, always.
  c.strokeStyle = GREEN; c.lineWidth = 3
  const m = 12, L = 20
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]] as const) {
    c.beginPath(); c.moveTo(x, y + 18 * sy); c.lineTo(x, y); c.lineTo(x + L * sx, y); c.stroke()
  }
  void t
}

function drawHear(c: CanvasRenderingContext2D, s: PanelState, t: number) {
  ground(c)
  const n = 15
  const mid = (H - 34) / 2 + 8
  for (let i = 0; i < n; i++) {
    const v = s.levels ? s.levels[Math.floor((i / n) * s.levels.length)] : 0
    // With no microphone, idle at a low shimmer: enough to read as a meter at
    // rest rather than a row of dots, low enough not to be mistaken for sound.
    const amp = s.levels ? v : 0.10 + 0.16 * Math.abs(Math.sin(t / 420 + i * 0.8))
    const h = Math.max(6, amp * 150)
    c.fillStyle = CYAN
    roundRect(c, 18 + i * 20, mid - h / 2, 10, h, 5)
    c.fill()
  }
  c.strokeStyle = DIM; c.lineWidth = 1.5
  c.beginPath(); c.moveTo(10, H - 34); c.lineTo(W - 10, H - 34); c.stroke()
  status(c, s.levels ? 'MIC LIVE  ·  OUT 1W' : (s.notice ?? 'Allow the microphone'))
}

function drawTouch(c: CanvasRenderingContext2D, s: PanelState, t: number) {
  ground(c)
  const cells = [[70, 100], [160, 100], [250, 100]] as const
  for (const [x, y] of cells) {
    c.strokeStyle = DIM; c.lineWidth = 3
    roundRect(c, x - 26, y - 26, 52, 52, 14); c.stroke()
  }
  for (const r of s.ripples) {
    const age = (t - r.born) / 620
    // A clock stamped elsewhere can arrive ahead of this one; a negative age
    // would ask the canvas for a negative radius, which throws and takes the
    // whole render loop with it.
    if (age < 0 || age > 1) continue
    c.strokeStyle = CYAN
    c.globalAlpha = 1 - age
    c.lineWidth = 3
    c.beginPath(); c.arc(r.x, r.y, 8 + age * 90, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = 1
  }
  const last = s.ripples[s.ripples.length - 1]
  status(c, last ? `FT6336U  ${Math.round(last.x)},${Math.round(last.y)}` : 'FT6336U  TAP THE SCREEN')
}

function drawOnline(c: CanvasRenderingContext2D, s: PanelState, t: number) {
  ground(c)
  const elapsed = Math.max(0, t - s.wifiAt)
  const lit = Math.min(3, Math.floor(elapsed / 420))
  for (let i = 0; i < 3; i++) {
    const rr = 30 + i * 26
    c.strokeStyle = i < lit ? CYAN : DIM
    c.lineWidth = 9; c.lineCap = 'round'
    c.beginPath(); c.arc(160, 142, rr, Math.PI, 0); c.stroke()
  }
  c.fillStyle = CYAN
  c.beginPath(); c.arc(160, 150, 7.5, 0, Math.PI * 2); c.fill()
  const done = lit >= 3
  if (done) {
    c.strokeStyle = GREEN; c.lineWidth = 7; c.lineJoin = 'round'
    c.beginPath(); c.moveTo(138, 186); c.lineTo(152, 200); c.lineTo(182, 168); c.stroke()
  }
  status(c, done ? 'WI-FI  CONNECTED' : 'WI-FI  JOINING…', done ? GREEN : CYAN)
}

/* -------------------------------- game -------------------------------- */

export type GameState = {
  /** Paddle centre, 0–W. */
  paddle: number
  ball: { x: number; y: number; vx: number; vy: number }
  score: number
  over: boolean
}

export function newGame(): GameState {
  return { paddle: W / 2, ball: { x: W / 2, y: 60, vx: 2.4, vy: 2.9 }, score: 0, over: false }
}

/** One tick. Kept here so the panel and the page agree on the rules. */
export function stepGame(g: GameState) {
  if (g.over) return
  const b = g.ball
  b.x += b.vx; b.y += b.vy
  if (b.x < 8 || b.x > W - 8) b.vx *= -1
  if (b.y < 8) b.vy *= -1
  const padY = H - 40
  if (b.y > padY - 8 && b.y < padY + 8 && Math.abs(b.x - g.paddle) < 34 && b.vy > 0) {
    b.vy *= -1
    b.vx += (b.x - g.paddle) * 0.06
    g.score += 1
  }
  if (b.y > H) g.over = true
}

function drawGame(c: CanvasRenderingContext2D, g: GameState) {
  ground(c, '#0b1618')
  c.fillStyle = CYAN
  c.beginPath(); c.arc(g.ball.x, g.ball.y, 7, 0, Math.PI * 2); c.fill()
  roundRect(c, g.paddle - 34, H - 46, 68, 12, 6); c.fill()
  c.font = '13px ui-monospace, monospace'
  c.fillStyle = CYAN
  c.fillText(String(g.score).padStart(3, '0'), W - 44, 24)
  if (g.over) {
    c.fillStyle = '#ff6b6b'
    c.textAlign = 'center'
    c.fillText('TAP TO RESTART', W / 2, H / 2)
    c.textAlign = 'left'
  }
  status(c, g.over ? 'GAME OVER' : 'DRAG TO MOVE')
}

/* ------------------------------ entry point ---------------------------- */

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

export function drawPanel(c: CanvasRenderingContext2D, s: PanelState, t: number) {
  switch (s.mode) {
    case 'see': return drawSee(c, s, t)
    case 'hear': return drawHear(c, s, t)
    case 'touch': return drawTouch(c, s, t)
    case 'online': return drawOnline(c, s, t)
    case 'game': return s.game ? drawGame(c, s.game) : drawFace(c, s.faceId, t)
    default: return drawFace(c, s.faceId, t)
  }
}
