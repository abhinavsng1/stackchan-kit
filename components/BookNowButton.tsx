'use client'

import { useState } from 'react'
import { openMagicCheckout } from '@/lib/magic-checkout'
import { useShell } from '@/lib/shell-store'
import { useEdition } from '@/lib/edition-store'
import { isOrderableShell, DEFAULT_SHELL } from '@/lib/shells'
import { EV, track } from '@/lib/analytics'

/**
 * Book now, wherever it is pressed.
 *
 * The header's button and the bar that follows you up the page used to jump
 * to the order section and leave the buyer to start again. They now open the
 * same payment window the buy panel does, for the ₹499 deposit, with the
 * colour the page is currently showing.
 *
 * That colour matters more here than anywhere else: Razorpay's window cannot
 * ask for one, so whatever the page is showing at the moment of the tap is
 * what gets built and charged for. It reads the shared store, which is what
 * every swatch on the page writes to — so somebody who picked Moss beside
 * the robot and then pressed Book in the header gets Moss.
 *
 * With Magic Checkout off it is an ordinary link to the form, exactly as it
 * was, because that is still the path that works for everybody.
 */
export default function BookNowButton({
  magic,
  location,
  className,
  tabIndex,
  onPress,
  children,
}: {
  magic: boolean
  location: string
  className: string
  /** The sticky bar is off-screen until it is shown, and must not be tabbable. */
  tabIndex?: number
  /** Run before the window opens — the mobile menu closes itself this way. */
  onPress?: () => void
  children: React.ReactNode
}) {
  const previewed = useShell()
  const edition = useEdition()
  const [working, setWorking] = useState(false)

  if (!magic) {
    return (
      <a
        href="#reserve"
        className={className}
        tabIndex={tabIndex}
        onClick={() => { onPress?.(); track(EV.reserveCtaClicked, { location, edition }) }}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={className}
      tabIndex={tabIndex}
      disabled={working}
      onClick={async () => {
        if (working) return
        onPress?.()
        setWorking(true)
        track(EV.reserveCtaClicked, { location, edition })
        await openMagicCheckout({
          plan: 'deposit',
          qty: 1,
          shell: isOrderableShell(previewed) ? previewed : DEFAULT_SHELL,
          from: location,
          // Whatever happens next, this button goes back to being a button.
          // The buy panel is what reports a failure to the buyer, because it
          // is where the form appears.
          onDone: () => setWorking(false),
          onDismissed: () => setWorking(false),
          onFailed: () => {
            setWorking(false)
            // Nothing is said up here. The panel below has already been told
            // and will scroll itself into view with the form.
            document.getElementById('reserve')?.scrollIntoView({ block: 'start' })
          },
        })
      }}
    >
      {working ? 'Opening…' : children}
    </button>
  )
}
