/**
 * The colourways.
 *
 * One list, used by the live robot, the renders, the hero's swatches and the
 * colour section. A second copy would drift, and the failure is silent: a
 * swatch whose colours no longer match the render it points at.
 *
 * Each colourway colours the printed parts: the shell — head, the CoreS3
 * Lite's housing and the base, always one colour so the robot reads as one
 * object from its face to its feet — and the neck between them, which can
 * contrast (lib/robot-body.ts).
 *
 * `hex` is the colourway's lead colour — its head — and is what a single
 * swatch shows.
 */
export type Shell = {
  id: string
  name: string
  hex: string
  head: string
  neck: string
  base: string
  /** One line on the idea behind the combination. */
  note: string
}

export const SHELLS: Shell[] = [
  {
    id: 'graphite', name: 'Graphite', hex: '#2b2d31',
    head: '#2b2d31', neck: '#17181b', base: '#2b2d31',
    note: 'Near-black, with a darker neck. Disappears into a dark desk.',
  },
  {
    id: 'bone', name: 'Bone', hex: '#ece8df',
    head: '#ece8df', neck: '#bdb6a8', base: '#ece8df',
    note: 'Warm white, with a stone neck. Quiet on a light desk.',
  },
  {
    id: 'ember', name: 'Ember', hex: '#e2581a',
    head: '#e2581a', neck: '#18191c', base: '#e2581a',
    note: 'Burnt orange, with a graphite neck. The loud one.',
  },
  {
    id: 'signal', name: 'Signal', hex: '#5ccfd4',
    head: '#5ccfd4', neck: '#ece8df', base: '#5ccfd4',
    note: 'Cyan, with a bone neck. Bright, never shouty.',
  },
  {
    id: 'moss', name: 'Moss', hex: '#7f9b55',
    head: '#7f9b55', neck: '#ece8df', base: '#7f9b55',
    note: 'Moss green, with a bone neck. Grown, not made.',
  },
]


/**
 * The colourway ids, derived rather than retyped.
 *
 * The order schema validates against this, so a colourway that is removed
 * from the list stops being orderable in the same commit — rather than the
 * two drifting until someone orders a colour nobody prints any more.
 */
export const SHELL_IDS = SHELLS.map((s) => s.id) as [string, ...string[]]

/** What a buyer gets if they never touch the picker. */
export const DEFAULT_SHELL = 'graphite'

/**
 * The colourway the page shows first, and so the one the order form starts
 * on. It differs from DEFAULT_SHELL on purpose: that is what an order with no
 * colour at all is recorded as (a tab opened before colours existed), while
 * this is what a visitor actually sees — and whatever they see is what they
 * order unless they change it.
 */
export const LEAD_SHELL = 'ember'

export const shellById = (id: string): Shell => SHELLS.find((s) => s.id === id) ?? SHELLS[0]
