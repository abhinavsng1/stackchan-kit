/**
 * Pebble's voice: a recorded clip for every line it says (public/media/voice).
 *
 * It used to be the browser's own speech, which meant a different voice on
 * every phone, often a grown-up's and sometimes an accent nobody chose, and no
 * voice at all inside some in-app browsers. The clips are one voice
 * everywhere: clear, small and young, with a little robot in it.
 * tools/voice/render.py makes them, from the same lines as below.
 */
export const LINES: Record<string, string> = {
  'Hi! I’m Pebble!': 'hello',
  'On it! Five minutes, starting now!': 'timer',
  'Ooh, it’ll rain this evening! Don’t forget your umbrella!': 'rain',
  'Let’s start with one thing that matters most. Give it your freshest hour, leave room for a break, then take the small tasks one at a time.': 'plan-day',
  'An octopus has three hearts. Two pump blood to its gills, and one keeps it flowing to the rest of its body. A reminder that nature is wonderfully inventive.': 'octopus',
  'One small step counts. Pick something you can finish in five minutes. I’ll keep you company while you get started.': 'encourage',
}

const clip = (text: string) => {
  const id = LINES[text.replace(/\s+/g, ' ').trim()]
  return id ? `/media/voice/${id}.mp3` : null
}

/** Whether this browser can play Pebble's voice at all. */
export const canSpeak = () => typeof window !== 'undefined' && typeof Audio !== 'undefined'

// One player for every line. iPhones let a page play sound only from a tap;
// once a player has played from one, it may play again without.
let player: HTMLAudioElement | null = null
let finish: (() => void) | null = null

/**
 * Say `text` as Pebble. Returns false when there is no clip for it or no way
 * to play one, so a caller waiting on `end` is never left waiting.
 */
export function sayAsPebble(text: string, on: { start?: () => void; end?: () => void } = {}): boolean {
  const src = clip(text)
  if (!src || !canSpeak()) return false
  hushPebble()
  const a = (player ??= new Audio())
  let done = false
  const end = () => {
    if (done) return
    done = true
    if (finish === end) finish = null
    on.end?.()
  }
  finish = end
  a.onplaying = () => { if (!done) on.start?.() }
  a.onended = a.onerror = end
  a.src = src
  a.play().catch(end)
  return true
}

export function hushPebble(): void {
  player?.pause()
  finish?.()
}

/** Fetch these lines ahead, once somebody has asked to hear them. */
export function warmPebble(texts: string[]): void {
  if (!canSpeak()) return
  for (const t of texts) {
    const src = clip(t)
    if (src) void fetch(src).catch(() => {})
  }
}
