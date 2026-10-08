'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { SHELLS } from '@/lib/shells'
import Swatch from '@/components/site/Swatch'
import { EASE, Reveal } from '@/components/site/motion'

/**
 * The five shells. Picking one swaps the robot in frame — all five renders
 * come from the same model at the same camera, so the colour is the only
 * thing that changes. Renders, and labelled as such.
 *
 * The name of the colour is set very large behind the robot: the colour is
 * the subject of this section, so it gets the typography.
 */
export default function Colours() {
  // Ember leads, as it does in the hero.
  const [active, setActive] = useState(() => Math.max(0, SHELLS.findIndex((s) => s.id === 'ember')))
  const shell = SHELLS[active]

  return (
    <section id="colours" className="section scroll-mt-16 overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="wrap">
        <div className="grid lg:grid-cols-12 gap-x-10 gap-y-8 items-end">
          <Reveal className="lg:col-span-6">
            <p className="t-label m-0 mb-6">Five colours</p>
            <h2 className="t-display t-h2 m-0">Pick the one that’s you.</h2>
          </Reveal>
          <Reveal className="lg:col-span-5 lg:col-start-8" delay={0.1}>
            <p className="t-lead m-0">
              Each one pairs a head, a neck and a base that belong together.
              Same robot, same price — tell us your colour when we email to
              confirm your order.
            </p>
          </Reveal>
        </div>

        <div className="relative mt-12 md:mt-16">
          {/* The colour's name, huge and quiet, behind the robot. */}
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none select-none overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={shell.id} className="t-display inline-block"
                           style={{ fontSize: 'clamp(96px, 22vw, 340px)', color: 'var(--surface-2)', letterSpacing: '-0.06em' }}
                           initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
                           transition={{ duration: 0.5, ease: EASE }}>
                {shell.name}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="relative mx-auto max-w-[760px]" style={{ aspectRatio: '4 / 3' }}>
            {SHELLS.map((s, i) => (
              <motion.div key={s.id} className="absolute inset-0"
                          initial={false}
                          animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 0.97 }}
                          transition={{ duration: 0.5, ease: EASE }}>
                <Image src={`/media/shots/float-shell-${s.id}.webp`} fill
                       sizes="(max-width: 768px) 92vw, 760px"
                       alt={`PebbleRobo with a ${s.name} shell`} aria-hidden={i !== active}
                       className="object-contain" />
              </motion.div>
            ))}
            <span className="tag absolute right-0 bottom-2">Render</span>
          </div>

          <div role="radiogroup" aria-label="Shell colour"
               className="relative flex flex-wrap justify-center gap-2 sm:gap-3 mt-6">
            {SHELLS.map((s, i) => (
              <button key={s.id} type="button" role="radio" aria-checked={i === active}
                      onClick={() => setActive(i)}
                      className="flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full cursor-pointer text-[14.5px] transition-colors duration-200"
                      style={{
                        border: `1px solid ${i === active ? 'var(--ink)' : 'var(--line)'}`,
                        background: i === active ? 'var(--bg)' : 'transparent',
                      }}>
                <Swatch way={s} size={24} />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
