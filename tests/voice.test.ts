import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { LINES } from '@/lib/voice'

/**
 * The conversation's voices are recorded: one clip per line, the same voices
 * on every device. Browser speech gave each phone its own voice, a grown-up's
 * on most and an accent nobody chose on some. What is tested here is that
 * every line said has its clip, and that the clips are the ones played.
 */
const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const clipFile = (id: string) => new URL(`../public/media/voice/${id}.mp3`, import.meta.url)

describe('Pebble’s lines', () => {
  it('each have a clip on disk, small enough to fetch on a tap', () => {
    for (const id of Object.values(LINES)) {
      expect(existsSync(clipFile(id)), id).toBe(true)
      expect(statSync(clipFile(id)).size, id).toBeLessThan(80_000)
    }
  })

  it('are rendered from the same words they are shown with', () => {
    // tools/voice/render.py holds the text it speaks; a line changed in one
    // place and not the other would say something the bubble does not.
    const script = read('tools/voice/render.py')
    expect(script).toContain("voice='am_michael'")
    for (const [text, id] of Object.entries(LINES)) expect(script, id).toContain(`'${id}': '${text}'`)
  })

  it('cover everything the hero and the demo say', () => {
    const hero = read('components/site/HeroConversation.tsx')
    const said = [...hero.matchAll(/who: 'pebble', text: '([^']+)'/g)].map((m) => m[1].replace(/\\n/g, ' '))
    const asked = [...hero.matchAll(/text: (ASK_\w+)/g)].map((m) => hero.match(new RegExp(`const ${m[1]} = '([^']+)'`))![1])
    const demo = read('components/site/DemoStage.tsx')
    const block = demo.slice(demo.indexOf('const ANSWERS'), demo.indexOf('\n]', demo.indexOf('const ANSWERS')))
    const answers = [...block.matchAll(/\['[^']+', '([^']+)'\]/g)].map((m) => m[1])
    expect(said.length).toBe(3)
    expect(new Set(asked)).toEqual(new Set(['Hey Pebble, set a timer for 5 minutes.', 'Will it rain today?']))
    expect(answers.length).toBe(3)
    for (const line of [...said, ...asked, ...answers]) expect(Object.keys(LINES), line).toContain(line)
  })

  it('no longer lean on the browser’s own speech', () => {
    for (const file of ['lib/voice.ts', 'components/site/HeroConversation.tsx', 'components/site/DemoStage.tsx']) {
      expect(read(file), file).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/)
    }
  })
})

describe('saying one', () => {
  const played: string[] = []
  async function load() {
    vi.resetModules()
    played.length = 0
    class FakeAudio {
      src = ''; onplaying?: () => void; onended?: () => void; onerror?: () => void
      play() { played.push(this.src); this.onplaying?.(); return Promise.resolve() }
      pause() {}
    }
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('window', {})
    return import('@/lib/voice')
  }
  afterEach(() => { vi.unstubAllGlobals() })

  it('plays that line’s clip, and says when it starts', async () => {
    const { speakLine } = await load()
    const start = vi.fn()
    expect(speakLine('Ooh, it’ll rain this evening!\nDon’t forget your umbrella!', { start })).toBe(true)
    expect(played).toEqual(['/media/voice/rain.mp3'])
    expect(start).toHaveBeenCalled()
  })

  it('says no to a line it has no clip for, so nobody waits on it', async () => {
    const { speakLine } = await load()
    expect(speakLine('Something new')).toBe(false)
    expect(played).toEqual([])
  })

  it('stops one line when the next begins, and reports the first as ended', async () => {
    const { speakLine } = await load()
    const end = vi.fn()
    speakLine('Hi! I’m Pebble!', { end })
    speakLine('On it! Five minutes, starting now!')
    expect(end).toHaveBeenCalledTimes(1)
  })
})

describe('the hero’s conversation', () => {
  const src = read('components/site/HeroConversation.tsx')

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
