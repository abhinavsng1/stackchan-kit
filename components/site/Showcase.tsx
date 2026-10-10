'use client'

import Clip from '@/components/Clip'
import { Stagger, StaggerItem } from '@/components/site/motion'
import { smoothScrollTo } from '@/lib/smooth-scroll'
import { EV, track } from '@/lib/analytics'

/**
 * Two moments, side by side, before the full demo: a video call with a face
 * on its screen, and a dance. Rendered loops of the same robot as the rest of
 * the page (tools/assets/build-site.mjs), labelled as renders, each a door
 * into that mode on the live robot below.
 */
const MOMENTS = [
  {
    loop: 'loop-videocall', mode: 'call', tag: 'Video call',
    title: 'Call home, and be there.',
    body: 'Video call it from your phone and your face lights up its screen, so whoever’s at the desk sees you, not just hears you.',
    alt: 'PebbleRobo on a video call, a person’s face on its screen, talking',
  },
  {
    loop: 'loop-dance', mode: 'dance', tag: 'Dance',
    title: 'And when it’s time to have fun.',
    body: 'Ask it to dance and it sways, bobs on the beat and grins the whole way through. Music notes included.',
    alt: 'PebbleRobo dancing, swaying and bobbing, music notes on its screen',
  },
]

export default function Showcase() {
  const tryIt = (mode: string) => {
    window.dispatchEvent(new CustomEvent('pebble:demo', { detail: mode }))
    track(EV.demoModeChosen, { mode, location: 'showcase' })
    smoothScrollTo('does')
  }

  return (
    <section id="showcase" className="section scroll-mt-16" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <Stagger className="grid md:grid-cols-2 gap-4 md:gap-6">
          {MOMENTS.map((m) => (
            <StaggerItem key={m.loop} as="article" className="group">
              <div className="media" style={{ aspectRatio: '4 / 3', background: 'var(--surface-2)' }}>
                <Clip src={`/media/render/${m.loop}`} poster={`/media/render/${m.loop}.webp`}
                      alt={m.alt} className="absolute inset-0" />
                <span className="absolute left-4 top-4 t-mono text-[11px] px-2 py-1 rounded"
                      style={{ background: 'rgba(17,17,17,.78)', color: '#fff' }}>{m.tag}</span>
                <span className="tag absolute right-4 bottom-4">Render</span>
              </div>
              <h3 className="t-display t-h3 mt-5 mb-2">{m.title}</h3>
              <p className="text-[16px] leading-[1.55] text-[var(--muted)] m-0 max-w-[46ch]">{m.body}</p>
              <button type="button" onClick={() => tryIt(m.mode)}
                      className="link text-[14.5px] mt-4 bg-transparent border-0 p-0 cursor-pointer">
                Try it on the robot <span aria-hidden="true">↓</span>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
