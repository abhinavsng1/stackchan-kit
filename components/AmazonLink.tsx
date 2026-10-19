'use client'

import { AMAZON, PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * The same robot, on Amazon.
 *
 * Deliberately quiet, and deliberately honest about the difference. Booking
 * here is ₹499 with the rest on delivery; Amazon is the full price up front,
 * with Amazon's own delivery and returns. Somebody who clicks expecting ₹499
 * and lands on ₹4,999 has been misled by this page, not by Amazon — so the
 * line says which is which before they go.
 *
 * It opens in a new tab, because the point of this link is to be a second
 * door rather than an exit.
 */
export default function AmazonLink({ location, className = '' }: { location: string; className?: string }) {
  return (
    <p className={`text-[13.5px] m-0 ${className}`} style={{ color: 'var(--muted)' }}>
      Prefer Amazon?{' '}
      <a
        href={AMAZON.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track(EV.amazonClicked, { location })}
        style={{ color: 'var(--accent-ink)' }}
      >
        Also available on Amazon
      </a>{' '}
      — {PRICE.now} in full there, with Amazon’s delivery and returns.
    </p>
  )
}
