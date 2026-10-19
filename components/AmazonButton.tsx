'use client'

import Image from 'next/image'
import { AMAZON } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * "Also on Amazon", as a button rather than a line of small print.
 *
 * It sits beside the hero's own call to action and is deliberately the
 * quieter of the two: booking here is ₹499 and the robot ships from us, so
 * the primary action stays primary. What this buys is the trust of a
 * marketplace somebody already has an account with.
 *
 * If Amazon's official badge has been downloaded (see lib/kit.ts) it is shown
 * as the label; otherwise the button says it in words. No hand-drawn
 * approximation of the logo: it is a registered mark with its own rules, and
 * a redrawn one would be both worse and not ours to redraw.
 */
export default function AmazonButton({ location, className = '' }: { location: string; className?: string }) {
  return (
    <a
      href={AMAZON.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(EV.amazonClicked, { location })}
      className={`btn btn-ghost hero-cta ${className}`}
      aria-label="Also available on Amazon, opens in a new tab"
    >
      {AMAZON.badge
        ? <Image src={AMAZON.badge} alt="Available at Amazon" width={120} height={26} style={{ height: 22, width: 'auto' }} />
        : <>Also on Amazon</>}
      <span className="arrow" aria-hidden="true">↗</span>
    </a>
  )
}
