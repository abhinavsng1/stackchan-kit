/**
 * The twelve faces the firmware actually draws.
 *
 * Geometry and colours are transcribed from the Stack-chan Face Atlas
 * (stackchan-bench, src/main.cpp), at the true panel size of 320 x 240. These
 * are not stylised versions of the expressions — they are the expressions.
 */

export const SCREEN = { w: 320, h: 240 } as const
const EL = 104, ER = 216, EY = 100, MX = 160, MY = 176

/* ---- primitives, named after the LovyanGFX calls they stand in for ---- */

const rr = (x: number, y: number, w: number, h: number, r: number, c: string) =>
  `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`

const ci = (x: number, y: number, r: number, c: string) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`

const arc = (x: number, y: number, w: number, h: number, c: string, t: number, up: boolean) => {
  const x1 = x - w / 2, x2 = x + w / 2, cy = up ? y - h : y + h
  return `<path d="M${x1} ${y} Q${x} ${cy} ${x2} ${y}" fill="none" stroke="${c}" stroke-width="${t}" stroke-linecap="round"/>`
}

const ln = (x1: number, y1: number, x2: number, y2: number, c: string, t: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${t}" stroke-linecap="round"/>`

const poly = (pts: string, c: string) => `<polygon points="${pts}" fill="${c}"/>`

const zig = (x: number, y: number, w: number, c: string, t: number) => {
  const n = 5, step = w / n
  let d = `M${x - w / 2} ${y}`
  for (let i = 1; i <= n; i++) d += ` L${x - w / 2 + step * i} ${y + (i % 2 ? -7 : 7)}`
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${t}" stroke-linejoin="round" stroke-linecap="round"/>`
}

const star = (x: number, y: number, r: number, c: string) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="${c}"/>`

const heart = (x: number, y: number, s: number, c: string) =>
  `<path d="M${x} ${y + s * 0.85} C${x - s * 1.5} ${y - s * 0.25} ${x - s * 0.55} ${y - s * 1.15} ${x} ${y - s * 0.35} C${x + s * 0.55} ${y - s * 1.15} ${x + s * 1.5} ${y - s * 0.25} ${x} ${y + s * 0.85} Z" fill="${c}"/>`

const tear = (x: number, y: number, s: number, c: string) =>
  `<path d="M${x} ${y - s} C${x + s * 0.9} ${y + s * 0.25} ${x + s * 0.55} ${y + s} ${x} ${y + s} C${x - s * 0.55} ${y + s} ${x - s * 0.9} ${y + s * 0.25} ${x} ${y - s} Z" fill="${c}"/>`

const txt = (x: number, y: number, s: number, c: string, t: string, w = 700) =>
  `<text x="${x}" y="${y}" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="${w}" font-size="${s}" fill="${c}" text-anchor="middle">${t}</text>`

/* ------------------------------ the table ------------------------------ */

export type Face = {
  id: string
  name: string
  bg: string
  eye: string
  acc: string
  /** Arc or closed eyes do not blink. */
  blinks: boolean
  cmd: string
  use: string
  eyes: () => string
  rest: () => string
}

export const FACES: Face[] = [
  {
    id: 'neutral', name: 'Neutral', bg: '#07141C', eye: '#D8EEFF', acc: '#4E7C93', blinks: true,
    cmd: 'emote neutral', use: 'Boot state, and where every other mood decays back to.',
    eyes: () => rr(EL, EY, 46, 56, 16, '#D8EEFF') + rr(ER, EY, 46, 56, 16, '#D8EEFF'),
    rest: () => rr(MX, MY, 44, 7, 3, '#4E7C93'),
  },
  {
    id: 'happy', name: 'Happy', bg: '#17120A', eye: '#FFD166', acc: '#FF9E4F', blinks: false,
    cmd: 'emote happy', use: 'The default "yes, I heard you".',
    eyes: () => arc(EL, EY + 8, 54, 24, '#FFD166', 10, true) + arc(ER, EY + 8, 54, 24, '#FFD166', 10, true),
    rest: () => ci(EL - 4, MY - 22, 13, 'rgba(255,158,79,.22)') + ci(ER + 4, MY - 22, 13, 'rgba(255,158,79,.22)')
      + arc(MX, MY - 8, 84, 28, '#FF9E4F', 10, false),
  },
  {
    id: 'excited', name: 'Excited', bg: '#1A0A1E', eye: '#FF6FB0', acc: '#FFE6F4', blinks: true,
    cmd: 'emote excited', use: 'Anything that deserves a reaction.',
    eyes: () => ci(EL, EY, 27, '#FF6FB0') + ci(EL + 9, EY - 9, 8, '#FFE6F4')
      + ci(ER, EY, 27, '#FF6FB0') + ci(ER + 9, EY - 9, 8, '#FFE6F4'),
    rest: () => `<ellipse cx="${MX}" cy="${MY}" rx="26" ry="20" fill="#FFE6F4"/>`
      + star(46, 52, 11, '#FF6FB0') + star(288, 44, 9, '#FFE6F4') + star(270, 150, 7, '#FF6FB0'),
  },
  {
    id: 'love', name: 'Love', bg: '#1E0610', eye: '#FF4D6D', acc: '#FFB3C1', blinks: false,
    cmd: 'emote love', use: 'The thank-you state after something lands.',
    eyes: () => heart(EL, EY, 26, '#FF4D6D') + heart(ER, EY, 26, '#FF4D6D'),
    rest: () => arc(MX, MY, 40, 16, '#FFB3C1', 8, false)
      + heart(50, 56, 13, 'rgba(255,77,109,.55)') + heart(276, 40, 10, 'rgba(255,179,193,.5)'),
  },
  {
    id: 'sleepy', name: 'Sleepy', bg: '#080D1C', eye: '#8FA8DE', acc: '#3F5285', blinks: false,
    cmd: 'emote sleepy', use: 'Idle for a few minutes, or forgotten about.',
    eyes: () => rr(EL, EY + 12, 46, 24, 12, '#8FA8DE') + rr(EL, EY - 6, 46, 7, 3, '#3F5285')
      + rr(ER, EY + 12, 46, 24, 12, '#8FA8DE') + rr(ER, EY - 6, 46, 7, 3, '#3F5285'),
    rest: () => rr(MX, MY, 18, 5, 2, '#3F5285')
      + txt(268, 54, 26, '#8FA8DE', 'z') + txt(288, 34, 18, '#3F5285', 'z') + txt(248, 74, 17, '#3F5285', 'z'),
  },
  {
    id: 'sad', name: 'Sad', bg: '#06121E', eye: '#7FB2E5', acc: '#B8DCFF', blinks: true,
    cmd: 'emote sad', use: 'Limit hit, write rejected — the soft failure face.',
    eyes: () => rr(EL, EY, 46, 50, 16, '#7FB2E5')
      + poly(`${EL - 23},${EY - 25} ${EL + 23},${EY - 25} ${EL - 23},${EY - 7}`, '#06121E')
      + rr(ER, EY, 46, 50, 16, '#7FB2E5')
      + poly(`${ER - 23},${EY - 25} ${ER + 23},${EY - 25} ${ER + 23},${EY - 7}`, '#06121E'),
    rest: () => arc(MX, MY + 6, 52, 20, '#B8DCFF', 8, true) + tear(EL - 4, EY + 46, 10, '#B8DCFF'),
  },
  {
    id: 'angry', name: 'Angry', bg: '#1C0606', eye: '#FF7A5C', acc: '#FF3B1E', blinks: true,
    cmd: 'emote angry', use: 'Bus fault, torque refused, or a scowl on demand.',
    eyes: () => rr(EL, EY + 6, 46, 34, 12, '#FF7A5C') + rr(ER, EY + 6, 46, 34, 12, '#FF7A5C')
      + poly(`${EL - 24},${EY - 26} ${EL + 24},${EY - 12} ${EL + 24},${EY - 2} ${EL - 24},${EY - 16}`, '#FF3B1E')
      + poly(`${ER + 24},${EY - 26} ${ER - 24},${EY - 12} ${ER - 24},${EY - 2} ${ER + 24},${EY - 16}`, '#FF3B1E'),
    rest: () => arc(MX, MY + 8, 56, 20, '#FF3B1E', 11, true)
      + ci(52, 48, 9, 'rgba(255,59,30,.3)') + ci(70, 32, 6, 'rgba(255,59,30,.22)'),
  },
  {
    id: 'surprised', name: 'Surprised', bg: '#141306', eye: '#FFFFFF', acc: '#FFE08A', blinks: true,
    cmd: 'emote surprised', use: 'Someone joined the AP, or a command arrived while idle.',
    eyes: () => ci(EL, EY, 30, '#FFFFFF') + ci(EL, EY, 12, '#141306')
      + ci(ER, EY, 30, '#FFFFFF') + ci(ER, EY, 12, '#141306'),
    rest: () => ci(MX, MY, 17, '#FFE08A'),
  },
  {
    id: 'curious', name: 'Curious', bg: '#06180F', eye: '#7CE0B0', acc: '#C9FFE5', blinks: true,
    cmd: 'emote curious', use: 'Head-tilt cue, and the first gesture candidate.',
    eyes: () => ci(EL, EY + 6, 28, '#7CE0B0') + ci(EL + 8, EY - 2, 9, '#C9FFE5')
      + ci(ER, EY - 6, 19, '#7CE0B0') + ci(ER + 6, EY - 12, 6, '#C9FFE5'),
    rest: () => arc(MX - 6, MY, 38, 14, '#C9FFE5', 8, true) + txt(278, 60, 46, '#C9FFE5', '?'),
  },
  {
    id: 'doubt', name: 'Doubt', bg: '#161206', eye: '#E9C46A', acc: '#FFF0C2', blinks: false,
    cmd: 'emote doubt', use: 'Input accepted, but suspicious.',
    eyes: () => rr(EL, EY, 46, 13, 6, '#E9C46A') + rr(ER, EY, 46, 13, 6, '#E9C46A')
      + rr(EL, EY - 24, 40, 6, 3, '#FFF0C2')
      + `<g transform="rotate(-10 ${ER} ${EY - 32})">${rr(ER, EY - 32, 40, 6, 3, '#FFF0C2')}</g>`,
    rest: () => zig(MX, MY, 58, '#FFF0C2', 7),
  },
  {
    id: 'wink', name: 'Wink', bg: '#120720', eye: '#C792FF', acc: '#FFE6FF', blinks: false,
    cmd: 'emote wink', use: 'Acknowledgement, short enough not to annoy.',
    eyes: () => arc(EL, EY + 8, 54, 24, '#C792FF', 10, true)
      + ci(ER, EY, 27, '#C792FF') + ci(ER + 9, EY - 9, 8, '#FFE6FF'),
    rest: () => arc(MX, MY - 6, 72, 26, '#FFE6FF', 9, false) + star(58, 58, 10, '#FFE6FF'),
  },
  {
    id: 'error', name: 'Error', bg: '#220505', eye: '#FF3B30', acc: '#FFB3AE', blinks: false,
    cmd: 'automatic', use: 'Set by firmware only, and it never decays.',
    eyes: () => {
      const r = 22
      return [EL, ER].map((x) =>
        ln(x - r, EY - r, x + r, EY + r, '#FF3B30', 9) + ln(x + r, EY - r, x - r, EY + r, '#FF3B30', 9)).join('')
    },
    rest: () => zig(MX, MY - 4, 62, '#FFB3AE', 7)
      + `<rect x="1.5" y="1.5" width="317" height="237" fill="none" stroke="#FF3B30" stroke-width="3"/>`
      + txt(160, 226, 15, '#FFB3AE', 'FAULT — TORQUE OFF', 600),
  },
]

/** Complete SVG markup for one face, at true panel resolution. */
export function faceSvg(f: Face, { eyeScaleY = 1 } = {}) {
  const eyes = eyeScaleY === 1
    ? f.eyes()
    : `<g transform="translate(0 ${EY}) scale(1 ${eyeScaleY}) translate(0 ${-EY})">${f.eyes()}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SCREEN.w}" height="${SCREEN.h}" viewBox="0 0 ${SCREEN.w} ${SCREEN.h}">`
    + `<rect width="${SCREEN.w}" height="${SCREEN.h}" fill="${f.bg}"/>${f.rest()}${eyes}</svg>`
}

export const byId = (id: string) => FACES.find((f) => f.id === id) ?? FACES[0]
