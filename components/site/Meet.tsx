'use client'

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import Film from '@/components/site/Film'
import { EASE, Reveal } from '@/components/site/motion'

/**
 * Why it feels alive: the one idea that separates it from any other gadget,
 * read at the pace you scroll — each word comes up from grey to ink as it
 * passes the middle of the screen. What it can do is shown once, in the demo
 * below; this section only says why it feels different, beside the one film
 * on the page that is real footage.
 */
const STATEMENT =
  'Other gadgets wait for a command. PebbleRobo just lives here: blinking, looking around, keeping you company.'

export default function Meet() {
  const text = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: text, offset: ['start 85%', 'end 45%'] })
  const words = STATEMENT.split(' ')

  return (
    <section id="why" className="section scroll-mt-16">
      <div className="wrap">
        <p className="t-label m-0 mb-8">Why it feels alive</p>
        <p ref={text} className="t-display t-h2 m-0 max-w-[21ch] why-statement" aria-label={STATEMENT}>
          {words.map((w, i) => (
            <Word key={i} word={w} progress={scrollYProgress}
                  range={[i / words.length, (i + 1) / words.length]} />
          ))}
        </p>

        <div className="grid lg:grid-cols-12 gap-x-10 gap-y-14 mt-20 md:mt-28 items-center">
          <Reveal className="hidden sm:block lg:col-span-6">
            <p className="t-display m-0" style={{ fontSize: 'clamp(26px, 2.6vw, 38px)', lineHeight: 1.15 }}>
              Not a speaker on a shelf. A small companion that turns to look
              at you.
            </p>
            <p className="t-lead mt-6 mb-0 max-w-[40ch]">
              Press play for 22 seconds with a real one. No render, just a
              phone camera on an ordinary desk.
            </p>
          </Reveal>

          <Reveal className="lg:col-span-5 lg:col-start-8" y={36}>
            <div className="relative max-w-[420px] mx-auto">
              <Film id="meet" src="/media/robot/film-meet" title="An afternoon with PebbleRobo" length="0:22" />
              <span className="tag absolute left-4 top-4 pointer-events-none">Real footage · batch 01</span>
            </div>
          </Reveal>
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
