import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Pebble speaks with a woman's voice, warm rather than an announcer's. The
 * browser decides which voices exist, so what is tested is the choosing.
 */
type V = { name: string; lang: string }
const spoken: { text: string; voice?: V; pitch: number; rate: number }[] = []

async function withVoices(voices: V[]) {
  vi.resetModules()
  spoken.length = 0
  class Utterance {
    text: string; voice?: V; lang = ''; pitch = 1; rate = 1
    onstart?: () => void; onend?: () => void; onerror?: () => void
    constructor(text: string) { this.text = text }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  vi.stubGlobal('window', {
    speechSynthesis: {
      getVoices: () => voices,
      addEventListener: () => {},
      speak: (u: Utterance) => spoken.push({ text: u.text, voice: u.voice, pitch: u.pitch, rate: u.rate }),
      cancel: () => {},
    },
  })
  return import('@/lib/voice')
}

afterEach(() => { vi.unstubAllGlobals() })

describe('Pebble’s voice', () => {
  it('chooses a woman’s voice on an iPhone, over the default man’s', async () => {
    const { pebbleVoice } = await withVoices([
      { name: 'Daniel', lang: 'en-GB' }, { name: 'Rishi', lang: 'en-IN' },
      { name: 'Samantha', lang: 'en-US' }, { name: 'Veena', lang: 'en-IN' },
    ])
    expect(pebbleVoice()?.name).toBe('Veena')
  })

  it('prefers Indian English, then the natural voices Edge offers', async () => {
    const { pebbleVoice } = await withVoices([
      { name: 'Microsoft Prabhat Online (Natural) - English (India)', lang: 'en-IN' },
      { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US' },
      { name: 'Microsoft Neerja Online (Natural) - English (India)', lang: 'en-IN' },
    ])
    expect(pebbleVoice()?.name).toMatch(/Neerja/)
  })

  it('finds Chrome’s female voices by their names', async () => {
    const { pebbleVoice } = await withVoices([
      { name: 'Google UK English Male', lang: 'en-GB' }, { name: 'Google UK English Female', lang: 'en-GB' },
    ])
    expect(pebbleVoice()?.name).toBe('Google UK English Female')
  })

  it('never picks one of Apple’s joke voices', async () => {
    const { pebbleVoice } = await withVoices([
      { name: 'Bubbles', lang: 'en-US' }, { name: 'Whisper', lang: 'en-US' }, { name: 'Fred', lang: 'en-US' },
    ])
    expect(pebbleVoice()?.name).toBe('Fred')
  })

  it('speaks a touch higher and slower than the default', async () => {
    const { sayAsPebble } = await withVoices([{ name: 'Samantha', lang: 'en-US' }])
    expect(sayAsPebble('Done.')).toBe(true)
    expect(spoken[0]).toMatchObject({ text: 'Done.', voice: { name: 'Samantha' } })
    expect(spoken[0].pitch).toBeGreaterThan(1)
    expect(spoken[0].rate).toBeLessThan(1)
  })

  it('is the voice of both the hero and the demo', () => {
    for (const file of ['components/site/HeroConversation.tsx', 'components/site/DemoStage.tsx']) {
      const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      expect(src, file).toContain('sayAsPebble(')
      expect(src, file).not.toContain('new SpeechSynthesisUtterance')
    }
  })
})

describe('the hero’s conversation', () => {
  const src = readFileSync(new URL('../components/site/HeroConversation.tsx', import.meta.url), 'utf8')

  it('asks for a timer and about the rain, and answers both', () => {
    expect(src).toContain('set a timer for 5 minutes')
    expect(src).toContain('timer(5)')
    expect(src).toContain('Will it rain today?')
    expect(src).toMatch(/screen: rain/)
    expect(src).toMatch(/umbrella/)
  })

  it('stays silent until somebody turns the voice on', () => {
    expect(src).toContain('useState(false)')
    expect(src).toMatch(/aria-pressed=\{voice\}/)
  })
})
