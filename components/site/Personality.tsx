'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import Clip from '@/components/Clip'
import { EASE, Reveal } from '@/components/site/motion'

/**
 * Its personality, one behaviour at a time.
 *
 * On a wide screen the footage holds still on the left while three short
 * beats scroll past on the right, and the clip changes to whichever beat is
 * being read. On a phone a pinned frame would eat the screen, so each beat
 * carries its own clip instead.
 *
 * Each loop is rendered from the same rigged model as the live robot, moving
 * within the real servos' range, and is labelled as a render. Each claim is
 * something the shipped firmware does today.
 */
const BEATS = [
  {
    clip: 'loop-alive', n: '01',
    title: 'Always a little bit alive.',
    body: 'It blinks, it breathes, and it fidgets when it’s left alone. Shake it and it goes dizzy. Nobody told it to — it just does.',
  },
  {
    clip: 'loop-look', n: '02',
    title: 'It turns to look.',
    body: 'A motor in its neck turns its head, smoothly, the way you’d glance across a room when something catches your eye.',
  },
  {
    clip: 'loop-nod', n: '03',
    title: 'It nods along.',
    body: 'A second motor tips its head up and down. That small tilt is the difference between a gadget and something that seems curious.',
  },
] as const

export default function Personality() {
  const [active, setActive] = useState(0)

  return (
    <section id="does" className="section scroll-mt-16" style={{ background: 'var(--surface)' }}>
      <div className="wrap">
        <div className="grid lg:grid-cols-12 gap-x-10 mb-14 lg:mb-24">
          <Reveal className="lg:col-span-7">
            <p className="t-label m-0 mb-6">Its personality</p>
            <h2 className="t-display t-h2 m-0">
              Small moves.<br />Big <span className="accent">character</span>.
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-4 lg:col-start-9 self-end" delay={0.1}>
            <p className="t-lead mt-6 lg:mt-0 mb-0">
              Plug it in and it wakes up with a personality of its own. No app,
              no setup, nothing to teach it first.
            </p>
          </Reveal>
        </div>

        <div className="grid lg:grid-cols-12 gap-x-10">
          {/* The pinned frame, wide screens only. */}
          <div className="hidden lg:block lg:col-span-6">
            <div className="sticky top-[12vh]">
              <div className="media" style={{ aspectRatio: '4 / 5', background: 'var(--surface-2)' }}>
                {BEATS.map((b, i) => (
                  <motion.div key={b.clip} className="absolute inset-0"
                              initial={false}
                              animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 1.04 }}
                              transition={{ duration: 0.7, ease: EASE }}>
                    <Clip src={`/media/render/${b.clip}`} poster={`/media/render/${b.clip}.webp`}
                          alt={b.title} className="h-full" />
                  </motion.div>
                ))}
                <span className="tag absolute right-4 bottom-4">Render</span>
                <div className="absolute left-5 bottom-5 flex gap-1.5" aria-hidden="true">
                  {BEATS.map((b, i) => (
                    <span key={b.n} className="block h-[3px] rounded-full transition-all duration-500"
                          style={{ width: i === active ? 28 : 10, background: i === active ? 'var(--ink)' : 'rgba(17,17,17,.2)' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <ol className="lg:col-span-5 lg:col-start-8 list-none p-0 m-0">
            {BEATS.map((b, i) => (
              <Beat key={b.n} beat={b} index={i} onActive={setActive} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Beat({ beat, index, onActive }: {
  beat: (typeof BEATS)[number]; index: number; onActive: (i: number) => void
}) {
  const ref = useRef<HTMLLIElement>(null)
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' })
  useEffect(() => { if (inView) onActive(index) }, [inView, index, onActive])

  return (
    <li ref={ref} className="lg:min-h-[78vh] flex flex-col justify-center py-10 lg:py-0 border-t lg:border-t-0"
        style={{ borderColor: 'var(--line)' }}>
      <div className="lg:hidden media mb-7" style={{ aspectRatio: '4 / 5', background: 'var(--surface-2)' }}>
        <Clip src={`/media/render/${beat.clip}`} poster={`/media/render/${beat.clip}.webp`}
              alt={beat.title} className="h-full" />
        <span className="tag absolute right-4 bottom-4">Render</span>
      </div>
      <Reveal>
        <span className="t-mono text-[13px] text-[var(--accent-ink)]">{beat.n}</span>
        <h3 className="t-display t-h3 mt-3 mb-4" style={{ fontSize: 'clamp(30px, 3.2vw, 48px)' }}>
          {beat.title}
        </h3>
        <p className="text-[17px] leading-[1.6] text-[var(--muted)] m-0 max-w-[38ch]">{beat.body}</p>
      </Reveal>
    </li>
  )
}
