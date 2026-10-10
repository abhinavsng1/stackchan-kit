'use client'

import { smoothScrollTo } from '@/lib/smooth-scroll'

import FaceIcon from '@/components/site/FaceIcon'
import { Reveal, Stagger, StaggerItem } from '@/components/site/motion'
import { EV, track } from '@/lib/analytics'

/**
 * A day with it: situations, not features — where it fits into an ordinary
 * day. Each one opens the matching demo on the live robot above.
 */
const MOMENTS: { mood: string; when: string; title: string; body: string; mode: string }[] = [
  { mood: 'listening', when: 'Monday, 9 a.m.', title: 'Plan the week out loud.', body: 'Talk it through before the first meeting. It listens, answers, and helps you start.', mode: 'talk' },
  { mood: 'curious', when: 'The long afternoon', title: 'Company at your desk.', body: 'It glances over, blinks, pulls a face when you tap it. The room feels less empty.', mode: 'meet' },
  { mood: 'surprised', when: 'From the office', title: 'Check in on home.', body: 'Video call it, turn its head to look around the room, and see that all’s well.', mode: 'call' },
  { mood: 'happy', when: 'Kids home from school', title: 'Instant dance party.', body: 'Ask it to dance and it never says no. It’s the most popular thing in the room.', mode: 'dance' },
  { mood: 'pleased', when: 'After dinner', title: 'Practise a new language.', body: 'Ten minutes of Japanese a night, with a tutor that cheers when you get it right.', mode: 'talk' },
]

export default function Everyday() {
  const tryIt = (mode: string) => {
    window.dispatchEvent(new CustomEvent('pebble:demo', { detail: mode }))
    track(EV.demoModeChosen, { mode, location: 'everyday' })
    smoothScrollTo('does')
  }

  return (
    <section id="everyday" className="section scroll-mt-16">
      <div className="wrap">
        <div className="grid lg:grid-cols-12 gap-x-10 gap-y-6 items-end mb-12 md:mb-16">
          <Reveal className="lg:col-span-7">
            <p className="t-label m-0 mb-6">A day with it</p>
            <h2 className="t-display t-h2 m-0">Where it fits<br />into your day.</h2>
          </Reveal>
          <Reveal className="lg:col-span-4 lg:col-start-9" delay={0.1}>
            <p className="t-lead m-0">Five ordinary moments. Tap any of them to watch it happen.</p>
          </Reveal>
        </div>

        <Stagger className="moments grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {MOMENTS.map((m) => (
            <StaggerItem key={m.title} as="article" className="moment">
              <FaceIcon mood={m.mood} size={64} />
              <p className="t-mono text-[11.5px] text-[var(--muted)] mt-6 mb-2">{m.when}</p>
              <h3 className="t-display text-[22px] leading-[1.1] m-0">{m.title}</h3>
              <p className="text-[15px] leading-[1.55] text-[var(--muted)] mt-3 mb-5">{m.body}</p>
              <button type="button" onClick={() => tryIt(m.mode)} className="link text-[14.5px] mt-auto bg-transparent border-0 p-0 cursor-pointer self-start">
                Watch it <span aria-hidden="true">↑</span>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
