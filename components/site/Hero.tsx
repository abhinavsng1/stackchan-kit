'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import HeroRobot from '@/components/site/HeroRobot'
import { SplitHeadline, EASE } from '@/components/site/motion'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'
import { useEdition } from '@/lib/edition-store'

/**
 * The first screen. The robot is the protagonist and the headline is one
 * sentence about what it is like to have one — not what it is made of.
 *
 * Choreography, in order of importance: the robot settles in, the headline
 * rises word by word, then the line under it, then the actions, then the
 * facts along the bottom. Scrolling away, the robot drifts up a little slower
 * than the page, so the hero hands over rather than being cut off.
 */
export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const edition = useEdition()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const robotY = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%'])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const facts = [
    [PRICE.now, `${PRICE.deposit} to book`],
    ['Arrives ready', 'Built and tested'],
    ['No subscription', 'No monthly fee from us'],
    ['Free delivery', 'Anywhere in India'],
  ]

  return (
    <section ref={ref} id="hero" className="relative overflow-hidden"
             style={{ paddingTop: 'clamp(96px, 12vh, 140px)' }}>
      <div className="wrap grid items-center gap-y-6 lg:gap-x-10 lg:grid-cols-12 lg:min-h-[calc(100svh-300px)]">
        <motion.div className="lg:col-span-6 relative z-10" style={{ y: textY, opacity: fade }}>
          <motion.p className="t-label m-0 mb-6 flex items-center gap-3"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}>
            <span className="inline-block w-6 h-px" style={{ background: 'var(--accent)' }} aria-hidden="true" />
            {edition === 'kit' ? 'The desk companion, as a kit' : 'The desk companion'}
          </motion.p>

          <SplitHeadline as="h1" immediate delay={0.15}
                         className="t-display t-hero m-0"
                         text={'A little robot\nthat looks back.'}
                         accent={['back']} />

          <motion.p className="t-lead mt-7 mb-0 max-w-[30ch] sm:max-w-[36ch]"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.75, ease: EASE }}>
            PebbleRobo lives on your desk. It notices you, turns to look, pulls
            a face — and answers when you say its name.
          </motion.p>

          <motion.div className="flex flex-wrap items-center gap-3 mt-9"
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.9, ease: EASE }}>
            <a href="#buy" className="btn btn-brand btn-lg"
               onClick={() => track(EV.reserveCtaClicked, { location: 'hero', edition })}>
              Buy PebbleRobo <span className="arrow" aria-hidden="true">→</span>
            </a>
            <a href="#meet" className="btn btn-ghost btn-lg">Meet it</a>
          </motion.div>
        </motion.div>

        <motion.div className="lg:col-span-6 relative"
                    style={{ y: robotY }}
                    initial={{ opacity: 0, scale: 0.94, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 1.1, delay: 0.05, ease: EASE }}>
          <div className="mx-auto max-w-[560px] lg:max-w-[min(620px,64svh)] lg:mr-0">
            <HeroRobot area={ref} />
          </div>
        </motion.div>
      </div>

      {/* The facts, small, along the bottom of the first screen. */}
      <motion.div className="wrap mt-10 lg:mt-2 pb-10"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 1.15 }}>
        <dl className="grid grid-cols-2 lg:grid-cols-4 m-0 border-t" style={{ borderColor: 'var(--line)' }}>
          {facts.map(([k, v], i) => (
            <div key={k} className={`pt-4 pb-1 ${i % 2 ? 'pl-4 lg:pl-6' : 'lg:pl-6 lg:first:pl-0'} ${i > 0 ? 'lg:border-l' : ''}`}
                 style={{ borderColor: 'var(--line)' }}>
              <dt className="text-[15px] font-medium tracking-[-0.01em]">{k}</dt>
              <dd className="m-0 text-[13.5px] text-[var(--muted)]">{v}</dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  )
}
