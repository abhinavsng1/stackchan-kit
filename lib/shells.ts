/**
 * The colourways: black and white, the two the body is printed in.
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
    id: 'graphite', name: 'Black', hex: '#26272b',
    head: '#26272b', neck: '#18191c', base: '#26272b',
    note: 'Black, from its head to its feet. Disappears into a dark desk.',
  },
  {
    id: 'bone', name: 'White', hex: '#ece9e2',
    head: '#ece9e2', neck: '#dcd8cf', base: '#ece9e2',
    note: 'White, with a soft white neck. Quiet on a light desk.',
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
export const LEAD_SHELL = 'graphite'

export const shellById = (id: string): Shell => SHELLS.find((s) => s.id === id) ?? SHELLS[0]
