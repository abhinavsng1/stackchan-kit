'use client'

import Image from 'next/image'
import { AMAZON } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * Buy it on Amazon.
 *
 * The second button in the hero, and the reason it earns a button at all:
 * most people have bought from Amazon before and have not bought from us.
 * The logo is the whole point — "Amazon" set in our own type carries none of
 * that recognition.
 *
 * It stays the ghost button. Booking here is ₹499 against ₹4,999 there, so
 * the primary action is still the primary action.
 */
export default function AmazonButton({ location, className = '' }: { location: string; className?: string }) {
  return (
    <a
      href={AMAZON.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(EV.amazonClicked, { location })}
      className={`btn btn-ghost hero-cta ${className}`}
      aria-label="Buy on Amazon, opens in a new tab"
    >
      <span>Buy on</span>
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
