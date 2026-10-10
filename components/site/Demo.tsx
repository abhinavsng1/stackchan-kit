import DemoStage from '@/components/site/DemoStage'
import { Reveal } from '@/components/site/motion'

/**
 * What it does — shown, not listed. The section is the dark stage, so the
 * robot is the brightest thing in it.
 */
export default function Demo() {
  return (
    // One window tall on a wide screen: header, modes, robot and words all in
    // view together, so nobody has to scroll to see what they just picked.
    <section id="does" className="on-stage scroll-mt-0 overflow-hidden min-h-[100svh] flex flex-col justify-center demo-section">
      <div className="wrap demo-fill">
        <div className="grid lg:grid-cols-12 gap-x-10 gap-y-4 mb-4 sm:mb-7 items-end">
          <Reveal className="lg:col-span-7">
            <p className="t-label m-0 mb-3 sm:mb-4">What it does</p>
            <h2 className="t-display m-0" style={{ fontSize: 'clamp(30px, 4.2vw, 60px)' }}>
              Don’t read about it. <span className="accent">Watch it.</span>
            </h2>
          </Reveal>
          <Reveal className="hidden sm:block lg:col-span-4 lg:col-start-9" delay={0.1}>
            <p className="text-[16.5px] leading-[1.55] text-[var(--muted)] m-0">
              Pick one and the robot does it, with the same face and the same moves
              as the one you’ll unbox.
            </p>
          </Reveal>
        </div>
        <DemoStage />
      </div>
    </section>
  )
}
