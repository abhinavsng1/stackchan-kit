'use client'

import { motion } from 'motion/react'
import Clip from '@/components/Clip'
import { EASE, Reveal } from '@/components/site/motion'

/**
 * What's inside, written as senses. Each callout leads with what the part
 * does for you; the part itself is the small grey line underneath, for the
 * people who want to know. The full spec sheet is in the buy section.
 *
 * The picture is the robot coming apart — base, neck, head and face module —
 * and going back together: a loop rendered from the same rig as the live
 * model, and labelled as a render.
 */
const SENSES: [string, string][] = [
  ['Sees you', 'Camera, plus light and proximity sensors'],
  ['Hears you', 'Two microphones'],
  ['Talks back', '1 W speaker'],
  ['Looks around', 'Two motors in the neck — turn and tilt'],
  ['Feels a tap', '2-inch touch screen'],
  ['Thinks on its own', 'ESP32-S3, Wi-Fi and Bluetooth'],
]

export default function Inside() {
  return (
    <section id="inside" className="section scroll-mt-16" style={{ background: 'var(--surface)' }}>
      <div className="wrap">
        <div className="grid lg:grid-cols-12 gap-x-10 gap-y-12 items-center">
          <div className="lg:col-span-6 lg:order-2">
            <div className="media max-w-[560px] mx-auto" style={{ aspectRatio: '4 / 5', background: 'var(--surface-2)' }}>
              <Clip src="/media/render/loop-inside" poster="/media/render/loop-inside.webp"
                    alt="PebbleRobo coming apart into base, neck, head and face module, then going back together"
                    className="absolute inset-0" />
              <span className="tag absolute right-4 bottom-4">Render</span>
            </div>
          </div>

          <div className="lg:col-span-5 lg:order-1">
            <Reveal>
              <p className="t-label m-0 mb-6">What’s inside</p>
              <h2 className="t-display t-h2 m-0">Small. Not simple.</h2>
              <p className="t-lead mt-6 mb-0 max-w-[36ch]">
                Everything it needs to notice you and answer back, in something
                small enough for the corner of your desk.
              </p>
            </Reveal>

            <dl className="grid grid-cols-2 gap-x-6 m-0 mt-12">
              {SENSES.map(([what, part], i) => (
                <motion.div key={what} className="py-5 border-t" style={{ borderColor: 'var(--line)' }}
                            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                            transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }}>
                  <dt className="text-[18px] font-medium tracking-[-0.015em]">{what}</dt>
                  <dd className="m-0 mt-1 text-[13.5px] leading-[1.5] text-[var(--muted)]">{part}</dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
