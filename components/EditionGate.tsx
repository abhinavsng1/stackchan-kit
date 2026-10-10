'use client'

import { smoothScrollTo } from '@/lib/smooth-scroll'

import { setEdition, useEdition } from '@/lib/edition-store'
import { EV, track } from '@/lib/analytics'
import type { Edition } from '@/lib/kit'

/**
 * The page sells the assembled robot. Everything about building one — the
 * parts list, the four steps, the assembly film — is only shown once somebody
 * has chosen the kit, so a buyer who wants a finished robot never has to read
 * past instructions for a product they are not buying.
 *
 * The server always renders the default edition, so kit-only content is
 * absent from the first paint and appears the moment the kit is chosen.
 */
export function KitOnly({ children }: { children: React.ReactNode }) {
  return useEdition() === 'kit' ? <>{children}</> : null
}

/** One of two renderings, by edition. For short swaps of copy. */
export function ForEdition({ assembled, kit }: { assembled: React.ReactNode; kit: React.ReactNode }) {
  return <>{useEdition() === 'kit' ? kit : assembled}</>
}

/**
 * Changes the edition, and puts the visitor somewhere that makes sense
 * afterwards.
 *
 * Choosing the kit scrolls to the kit section, which has only just appeared.
 * Going back to the robot removes that section, so anyone reading it would be
 * dropped wherever the page happened to close up; they are taken to the buy
 * box instead, where the change they just made is visible.
 */
export function SwitchEdition({
  to, location, className, children,
}: {
  to: Edition
  location: string
  className?: string
  children: React.ReactNode
}) {
  const go = () => {
    const kit = document.getElementById('kit')?.getBoundingClientRect()
    const insideKit = Boolean(kit && kit.top < window.innerHeight * 0.5 && kit.bottom > 0)

    setEdition(to)
    track(EV.editionChosen, { edition: to, location })

    // Two frames: one for React to commit the change, one for layout.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (to === 'kit') smoothScrollTo('kit')
      else if (insideKit) smoothScrollTo('buy')
    }))
  }

  return (
    <button type="button" onClick={go} className={className}>
      {children}
    </button>
  )
}
