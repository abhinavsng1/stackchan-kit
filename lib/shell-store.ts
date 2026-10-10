'use client'

import { useSyncExternalStore } from 'react'
import { LEAD_SHELL, SHELL_IDS } from '@/lib/shells'

/**
 * Which colourway the visitor has chosen: one value, read by every control
 * that shows it — the hero's swatches, the colour explorer, the buy box and
 * the order form.
 *
 * If each held its own copy, picking Moss beside the robot and paying in the
 * form below would quietly order whatever the form had — so there is exactly
 * one, and choosing anywhere chooses everywhere. Same shape as
 * lib/edition-store.ts.
 */
let current: string = LEAD_SHELL
const listeners = new Set<() => void>()

export function setShell(id: string): void {
  if (id === current || !(SHELL_IDS as readonly string[]).includes(id)) return
  current = id
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useShell(): string {
  return useSyncExternalStore(subscribe, () => current, () => LEAD_SHELL)
}
