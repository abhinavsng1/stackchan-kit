'use client'

import LiveTurntable from '@/components/site/LiveTurntable'
import LiveLineup from '@/components/site/LiveLineup'
import ShellPicker from '@/components/site/ShellPicker'
import { Reveal } from '@/components/site/motion'
import { shellById } from '@/lib/shells'
import { useShell } from '@/lib/shell-store'

/**
 * Explore it: the product, configured. Spin the robot and pick its colour —
 * the same colour every other picker on the page and the order form use.
 * What it can do is said once, in the demo; this section is about how it looks.
 */
export default function Explore() {
  const way = shellById(useShell())

  return (
    <section id="explore" className="section scroll-mt-16" style={{ background: 'var(--surface)' }}>
      <div className="wrap">
        <div className="grid lg:grid-cols-12 gap-x-10 gap-y-12 items-center">
          <Reveal className="order-2 lg:col-span-6" y={36}>
            <div className="max-w-[560px] mx-auto">
              <LiveTurntable />
              <p className="t-mono text-[11.5px] text-[var(--muted)] mt-3 mb-0 text-center">
                Drag to spin it. It keeps an eye on you while it turns.
              </p>
            </div>
          </Reveal>

          <div className="order-1 lg:col-span-5">
            <Reveal>
              <p className="t-label m-0 mb-6">Explore it</p>
              <h2 className="t-display t-h2 m-0">Turn it round.<br />Pick its colour.</h2>
              <p className="t-lead mt-6 mb-0 max-w-[38ch]">
                Five colours, each one chosen to look good on a desk. Same robot,
                same price.
              </p>
            </Reveal>

            <div className="mt-8">
              <ShellPicker location="explore" size={28} label={false} />
              <p className="text-[15px] mt-3 mb-0">
                <span className="font-medium">{way.name}</span>
                <span className="text-[var(--muted)]">. {way.note}</span>
              </p>
            </div>

          </div>
        </div>

        {/* All five at once, every one of them watching you. */}
        <Reveal className="mt-20 md:mt-28" y={40}>
          <LiveLineup />
        </Reveal>
      </div>
    </section>
  )
}
