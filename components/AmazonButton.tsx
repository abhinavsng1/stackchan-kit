'use client'

import Image from 'next/image'
import { AMAZON } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * Also on Amazon.
 *
 * The second button in the hero. Most people have bought from Amazon before
 * and have not bought from us, and the logo is what carries that: "Amazon"
 * set in our own type would carry none of it.
 *
 * It says "Also on" rather than "Buy on" because, as a peer of Book, it was
 * taking four hero clicks for every one Book got, and in the first day none
 * of those clicks became an Amazon order. It is reassurance that the robot
 * is sold somewhere familiar, not the way in. Amazon's orange, as a tint
 * (.btn-amazon), so it reads as Amazon at a glance and Book stays the action.
 */
export default function AmazonButton({ location, className = '' }: { location: string; className?: string }) {
  return (
    <a
      href={AMAZON.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(EV.amazonClicked, { location })}
      className={`btn btn-amazon hero-cta ${className}`}
      aria-label="Also on Amazon, opens in a new tab"
    >
      <span>Also on</span>
      {/* Optically matched to the label beside it rather than set to the cap
          height: the wordmark's descender in the smile makes a logo set to
          the same height read smaller than the word next to it. */}
      <Image
        src={AMAZON.logo}
        alt="Amazon"
        width={603}
        height={182}
        style={{ height: '1.15em', width: 'auto', transform: 'translateY(0.12em)' }}
        priority={false}
      />
      <span className="arrow" aria-hidden="true">↗</span>
    </a>
  )
}
