'use client'

import { EDITION, EDITIONS, PRICE, type Edition } from '@/lib/kit'
import { setEdition, useEdition } from '@/lib/edition-store'
import { EV, track } from '@/lib/analytics'

/**
 * Robot or kit, as two cards.
 *
 * Rendered in the buy box and again in the order form. Both read and write the
 * same store, so the two can never disagree — see lib/edition-store.ts. Only
 * the form's copy carries `name="edition"`, so only the form submits it.
 *
 * Both cards show the price. It is the same on both, and saying so on each is
 * what stops anyone assuming the assembled one costs more.
 */
export default function EditionPicker({
  name, location, disabled,
}: {
  /** The form field name. Omit where the picker is not inside a form. */
  name?: string
  /** For analytics: which copy of the picker was used. */
  location: string
  disabled?: boolean
}) {
  const edition = useEdition()

  const choose = (e: Edition) => {
    if (e === edition) return
    setEdition(e)
    track(EV.editionChosen, { edition: e, location })
  }

  return (
    <fieldset className="m-0 p-0 border-0 min-w-0" disabled={disabled}>
      <legend className="t-label mb-3 p-0">Choose yours</legend>
      <div className="grid gap-2.5">
        {EDITIONS.map((e) => (
          <label key={e} className="edition-option" data-active={edition === e}
                 data-testid={`edition-${location}-${e}`}>
            <input
              type="radio"
              className="sr-only"
              name={name ?? `edition-${location}`}
              value={e}
              checked={edition === e}
              onChange={() => choose(e)}
            />
            <span className="edition-radio" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-semibold leading-snug">{EDITION[e].label}</span>
                <span className="t-mono text-[12.5px] shrink-0">{PRICE.now}</span>
              </span>
              <span className="block text-[13px] leading-[20px] text-[var(--muted)] mt-1">
                {EDITION[e].pitch}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
