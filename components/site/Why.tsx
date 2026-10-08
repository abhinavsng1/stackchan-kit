'use client'

import LiveLineup from '@/components/site/LiveLineup'
import { motion } from 'motion/react'
import { EASE, Reveal } from '@/components/site/motion'

/**
 * Why this rather than another gadget: four claims, each true today, each a
 * thing a buyer gets rather than a thing the robot is made of. Set as an
 * editorial list rather than a grid of cards — one line each, large.
 */
const CLAIMS = [
  {
    n: '01', title: 'Arrives ready.',
    body: 'Built, set up and tested before it ships. Plug it in and it wakes up.',
  },
  {
    n: '02', title: 'No subscription.',
    body: 'No account with us, no monthly fee. Its face, its moves and its wake word all run on the robot itself.',
  },
  {
    n: '03', title: 'A body, not a speaker.',
    body: 'It looks at you, nods and pulls faces. Something on your desk that is actually there.',
  },
  {
    n: '04', title: 'Yours to change.',
    body: 'It runs open-source software, so it keeps learning new tricks — from the community, or from you.',
  },
]

export default function Why() {
  return (
    <section id="why" className="section scroll-mt-16">
      <div className="wrap">
        <div className="grid lg:grid-cols-12 gap-x-10">
          <Reveal className="lg:col-span-4">
            <p className="t-label m-0 mb-6">Why PebbleRobo</p>
            <h2 className="t-display t-h2 m-0 lg:sticky lg:top-28">Not another gadget.</h2>
          </Reveal>

          <ol className="lg:col-span-8 list-none p-0 m-0 mt-12 lg:mt-0">
            {CLAIMS.map((c, i) => (
              <motion.li
                key={c.n}
                className="group grid grid-cols-[48px_minmax(0,1fr)] md:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] gap-x-6 gap-y-3 py-8 md:py-10 border-t last:border-b"
                style={{ borderColor: 'var(--line)' }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: EASE }}
              >
                <span className="t-mono text-[13px] text-[var(--muted-2)] pt-2 transition-colors duration-300 group-hover:text-[var(--accent-ink)]">
                  {c.n}
                </span>
                <h3 className="t-display m-0 transition-transform duration-500 group-hover:translate-x-1"
                    style={{ fontSize: 'clamp(28px, 3vw, 44px)', transitionTimingFunction: 'var(--ease)' }}>
                  {c.title}
                </h3>
                <p className="col-start-2 md:col-start-3 m-0 text-[16.5px] leading-[1.6] text-[var(--muted)] md:pt-2 max-w-[40ch]">
                  {c.body}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* The five of them, live, in an arc: one robot, five characters,
            every one of them watching the cursor. */}
        <Reveal className="mt-20 md:mt-28" y={40}>
          <LiveLineup />
        </Reveal>
      </div>
    </section>
  )
}
