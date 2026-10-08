'use client'

import { EDITION, PRICE } from '@/lib/kit'
import { setEdition, useEdition } from '@/lib/edition-store'
import { EV, track } from '@/lib/analytics'

/**
 * What happens after you pay, for whichever edition is chosen.
 *
 * The steps differ in exactly one place — who builds it — and that is the
 * place a buyer is most likely to have misunderstood, so the list follows the
 * picker rather than describing both at once.
 */
export function OrderSteps() {
  const edition = useEdition()
  const steps: [string, string][] = [
    ['You book', `Your details and ${PRICE.deposit}, on this page. Card, UPI, netbanking or EMI.`],
    edition === 'assembled'
      ? ['We build and test it', EDITION.assembled.prep]
      : ['We box your kit', 'Parts matched, shell printed, servos addressed and centred.'],
    ['We ship it', 'Dispatch within 1–2 weeks.'],
    ['You pay the rest', `${PRICE.balance} in cash to the courier, when the box reaches you.`],
    edition === 'assembled'
      ? ['You plug it in', 'Power on, and the face comes up. Nothing to build, nothing to flash.']
      : ['You build it', 'Four steps, one evening. Everything you need is in the box.'],
  ]

  return (
    <ol className="mt-6 mb-0 p-0 list-none grid gap-4">
      {steps.map(([title, body], i) => (
        <li key={title} className="flex gap-3">
          <span className="t-mono text-[12px] text-[var(--muted)] pt-[3px] shrink-0">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold">{title}</span>
            <span className="block text-[13px] text-[var(--muted)] mt-0.5">{body}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Picks an edition and goes straight to the order form. */
export function ChooseEdition({
  edition, children, className, location,
}: {
  edition: 'assembled' | 'kit'
  children: React.ReactNode
  className?: string
  location: string
}) {
  return (
    <a href="#reserve" className={className}
       onClick={() => {
         setEdition(edition)
         track(EV.editionChosen, { edition, location })
         track(EV.reserveCtaClicked, { location, edition })
       }}>
      {children}
    </a>
  )
}
