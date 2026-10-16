'use client'

import { useEffect } from 'react'
import { DEFAULT_EDITION, type Edition } from '@/lib/kit'
import { editionFromUrl, setEdition } from '@/lib/edition-store'

/**
 * Starts a page on an edition other than the site default — /kit starts on
 * the kit — while still letting `?edition=` in the address win, so an advert
 * for the assembled robot can land here too.
 *
 * Put back on the way out: the store outlives a client-side navigation, and
 * the home page sells the robot.
 */
export default function EditionDefault({ edition }: { edition: Edition }) {
  useEffect(() => {
    setEdition(edition)
    editionFromUrl()
    return () => setEdition(DEFAULT_EDITION)
  }, [edition])
  return null
}
