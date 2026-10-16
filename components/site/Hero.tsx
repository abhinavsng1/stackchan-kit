'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import HeroRobot from '@/components/site/HeroRobot'
import { SplitHeadline, EASE } from '@/components/site/motion'
import { EV, track } from '@/lib/analytics'
import { useEdition } from '@/lib/edition-store'
import { PRICE } from '@/lib/kit'

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

  return (
    // Exactly one screen tall on a wide display: the robot row sits on the
    // bottom edge of the first screen, not wherever the content happens to end.
    <section ref={ref} id="hero" className="relative overflow-hidden lg:min-h-[100svh] lg:flex lg:flex-col"
             style={{ paddingTop: 'clamp(96px, 12vh, 140px)' }}>
      {/* Three pieces, so a phone can put the robot between the headline and
          the words: headline → robot → line and buttons. On a wide screen the
          words stack on the left and the robot spans both rows on the right. */}
      <div className="wrap grid gap-y-6 lg:gap-y-0 lg:gap-x-10 lg:grid-cols-12 lg:grid-rows-[auto_auto] lg:content-center lg:flex-1">
        <motion.div className="lg:col-span-6 lg:row-start-1 lg:self-end relative z-10" style={{ y: textY, opacity: fade }}>
          <motion.p className="t-label m-0 mb-5 sm:mb-6 flex items-center gap-3"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}>
            <span className="inline-block w-6 h-px" style={{ background: 'var(--accent)' }} aria-hidden="true" />
            <span>The <span className="accent">AI companion</span> for your desk</span>
          </motion.p>

          <SplitHeadline as="h1" immediate delay={0.15}
                         className="t-display t-hero m-0"
                         text={'A little robot\nwith a life\nof its own.'}
                         accent={['own']} />
        </motion.div>

        <motion.div className="lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:row-span-2 lg:self-center relative"
                    style={{ y: robotY }}
                    initial={{ opacity: 0, scale: 0.94, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 1.1, delay: 0.05, ease: EASE }}>
          <div className="mx-auto max-w-[min(290px,34svh)] sm:max-w-[480px] lg:max-w-[min(620px,64svh)] lg:mr-0">
            <HeroRobot area={ref} />
          </div>
        </motion.div>

        <motion.div className="lg:col-span-6 lg:row-start-2 lg:self-start relative z-10" style={{ y: textY, opacity: fade }}>
          <motion.p className="t-lead mt-0 lg:mt-7 mb-0 max-w-[36ch]"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.75, ease: EASE }}>
            PebbleRobo is an{' '}
            <strong className="font-medium" style={{ color: 'var(--accent-ink)' }}>AI companion</strong>{' '}
            that lives on your desk. It keeps you company, talks with you, and
            makes the room feel a little less empty.
          </motion.p>

          {/* Equal halves side by side on a phone; natural widths from sm up. */}
          <motion.div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3 mt-7 lg:mt-9"
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.9, ease: EASE }}>
            <a href="#reserve" className="btn btn-brand hero-cta"
               onClick={() => track(EV.reserveCtaClicked, { location: 'hero', edition })}>
              Book for {PRICE.deposit} <span className="arrow hidden sm:inline" aria-hidden="true">→</span>
            </a>
            <a href="#does" className="btn btn-ghost hero-cta">See what it does</a>
          </motion.div>
          <motion.p className="t-mono text-[12.5px] text-[var(--muted)] mt-4 mb-0"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.0 }}>
            {PRICE.deposit} to book · {PRICE.now} to buy · the rest on delivery
          </motion.p>
        </motion.div>
      </div>

    </section>
  )
}
