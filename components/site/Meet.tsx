'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import Film from '@/components/site/Film'
import { Reveal } from '@/components/site/motion'

/**
 * What it is, in one statement, read at the pace you scroll: each word comes
 * up from grey to ink as it passes the middle of the screen. Then the real
 * thing, on a real desk — a film and a still, set at different depths so
 * they drift apart a little as you move past.
 */
const STATEMENT =
  'It isn’t a speaker with a light on it. It has a face, a neck and a mood — and it spends the day keeping you company.'

export default function Meet() {
  const text = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: text, offset: ['start 85%', 'end 45%'] })
  const words = STATEMENT.split(' ')

  const pics = useRef<HTMLDivElement>(null)
  const { scrollYProgress: p } = useScroll({ target: pics, offset: ['start end', 'end start'] })
  const slow = useTransform(p, [0, 1], ['6%', '-6%'])
  const fast = useTransform(p, [0, 1], ['18%', '-14%'])

  return (
    <section id="meet" className="section scroll-mt-16">
      <div className="wrap">
        <p className="t-label m-0 mb-8">Meet PebbleRobo</p>
        <p ref={text} className="t-display t-h2 m-0 max-w-[20ch]" aria-label={STATEMENT}>
          {words.map((w, i) => (
            <Word key={i} word={w} progress={scrollYProgress}
                  range={[i / words.length, (i + 1) / words.length]} />
          ))}
        </p>

        <div ref={pics} className="grid grid-cols-12 gap-3 sm:gap-6 mt-20 md:mt-32 items-start">
          <motion.div className="col-span-7 md:col-span-5 md:col-start-2" style={{ y: slow }}>
            <div className="relative">
              <Film id="meet" src="/media/robot/film-meet" title="An afternoon with PebbleRobo" length="0:20" />
              <span className="tag absolute left-4 top-4 pointer-events-none">Real footage · batch 01</span>
            </div>
          </motion.div>
          <motion.div className="col-span-5 md:col-span-4 md:col-start-8 mt-24 md:mt-40" style={{ y: fast }}>
            <div className="media" style={{ aspectRatio: '4 / 5' }}>
              <Image src="/media/render/meet-face.webp" fill quality={90}
                     sizes="(max-width: 768px) 40vw, 420px"
                     alt="PebbleRobo in Graphite, close up, smiling" className="object-cover" />
              <span className="tag absolute right-3 bottom-3">Render</span>
            </div>
            <Reveal delay={0.1}>
              <p className="text-[15px] leading-[1.5] text-[var(--muted)] mt-5 mb-0 max-w-[30ch] hidden sm:block">
                The film is a real unit from our first batch, on a real desk.
                Everything else is rendered from the same 3D model, and says so.
              </p>
            </Reveal>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function Word({ word, progress, range }: {
  word: string; progress: MotionValue<number>; range: [number, number]
}) {
  const opacity = useTransform(progress, range, [0.16, 1])
  // Asked for less motion: the statement is simply there, in full.
  const reduce = useReducedMotion()
  return (
    <>
      <motion.span aria-hidden="true" style={{ opacity: reduce ? 1 : opacity }}>{word}</motion.span>{' '}
    </>
  )
}
