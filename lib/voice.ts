/**
 * Pebble's voice, from the browser's own speech synthesis.
 *
 * Every browser ships different voices, and the default is often a man's.
 * Pebble speaks with a female voice wherever one is installed: Indian
 * English first, then British or American. It is pitched well up and hurried
 * along a little, so it sounds like an excited kid rather than a grown-up
 * reading the news: a woman's voice at its own pitch sounded too mature.
 *
 * Voice names are the only signal browsers give, so this is a list of the
 * female voices the common platforms ship (Apple, Windows, Android, Chrome),
 * and of male ones to keep away from.
 */
const FEMALE = /\bfemale\b|\bwoman\b|google us english|samantha|victoria|karen|moira|tessa|fiona|veena|isha|zira|heera|neerja|swara|aria|jenny|sonia|libby|natasha|serena|allison|\bava\b|\bzoe\b|nicky|susan|kate|joanna|salli|kimberly|en-in-x-ena|en-in-x-enc|en-us-x-sfg|en-us-x-tpc|en-gb-x-gba|en-gb-x-gbc/i
const MALE = /\bmale\b|\bman\b|daniel|\balex\b|fred|rishi|aaron|arthur|gordon|ravi|prabhat|david|\bmark\b|george|\bguy\b|ryan|thomas|oliver|en-in-x-end|en-in-x-ene/i
// Apple ships joke voices alongside the real ones (a choir, a cartoon, a whisper).
const NOVELTY = /bad news|good news|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|bahh|albert|hysterical|junior|ralph|kathy|grandma|grandpa|eddy|\bflo\b|reed|rocko|sandy|shelley/i

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let chosen: SpeechSynthesisVoice | null | undefined
if (supported()) {
  // Voices arrive asynchronously in Chrome; choose again once they have.
  window.speechSynthesis.addEventListener?.('voiceschanged', () => { chosen = undefined })
}

function rank(v: SpeechSynthesisVoice): number {
  const gender = FEMALE.test(v.name) ? 0 : MALE.test(v.name) ? 2 : 1
  const lang = /^en[-_]IN/i.test(v.lang) ? 0 : /^en[-_](GB|US)/i.test(v.lang) ? 1 : /^en/i.test(v.lang) ? 2 : 9
  // Apple's better recordings of the same voices. Not Microsoft's cloud
  // "natural" ones: the kid in the voice is all pitch, which those may not honour.
  const quality = /premium|enhanced/i.test(v.name) ? 0 : 1
  return (NOVELTY.test(v.name) ? 1000 : 0) + gender * 100 + lang * 10 + quality
}

/** The voice Pebble uses, or null to let the browser decide. */
export function pebbleVoice(): SpeechSynthesisVoice | null {
  if (!supported()) return null
  if (chosen !== undefined) return chosen
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang))
  if (!voices.length) return null // not loaded yet; not cached, so the next call tries again
  chosen = [...voices].sort((a, b) => rank(a) - rank(b))[0] ?? null
  return chosen
}

/** Whether this browser can speak at all. */
export const canSpeak = supported

/**
 * Say `text` as Pebble. Returns false when the browser cannot speak, so a
 * caller waiting on `end` is never left waiting.
 */
export function sayAsPebble(text: string, on: { start?: () => void; end?: () => void } = {}): boolean {
  if (!supported()) return false
  const u = new SpeechSynthesisUtterance(text)
  const v = pebbleVoice()
  if (v) { u.voice = v; u.lang = v.lang } else u.lang = 'en-IN'
  u.pitch = 1.7
  u.rate = 1.1
  u.onstart = () => on.start?.()
  u.onend = u.onerror = () => on.end?.()
  window.speechSynthesis.speak(u)
  return true
}

export function hushPebble(): void {
  if (supported()) window.speechSynthesis.cancel()
}
