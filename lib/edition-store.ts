'use client'

import { useSyncExternalStore } from 'react'
import { DEFAULT_EDITION, isEdition, type Edition } from '@/lib/kit'

/**
 * Which edition the visitor has chosen: one value, read by every control that
 * shows it.
 *
 * The buy box, the order form, the mobile buy bar and the kit section all
 * offer the same choice. If each held its own copy, picking the kit in one
 * place and paying in another would quietly order the robot — so there is
 * exactly one, and changing it anywhere changes it everywhere.
 *
 * The server always renders the default. `?edition=kit` in the address picks
 * the kit on arrival, so an advert for the kit can land on the kit.
 */

let current: Edition = DEFAULT_EDITION
const listeners = new Set<() => void>()

export function setEdition(next: Edition): void {
  if (next === current) return
  current = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useEdition(): Edition {
  return useSyncExternalStore(subscribe, () => current, () => DEFAULT_EDITION)
}

/** Reads `?edition=` once, on the client. Unknown values are ignored. */
export function editionFromUrl(): void {
  try {
    const wanted = new URLSearchParams(window.location.search).get('edition')
    if (isEdition(wanted)) setEdition(wanted)
  } catch { /* no URL to read */ }
}
