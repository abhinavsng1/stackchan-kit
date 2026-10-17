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
    id: 'graphite', name: 'Black', hex: '#26272b',
    head: '#26272b', neck: '#18191c', base: '#26272b',
    note: 'Black, from its head to its feet. Disappears into a dark desk.',
  },
  {
    id: 'bone', name: 'White', hex: '#ece9e2',
    head: '#ece9e2', neck: '#dcd8cf', base: '#ece9e2',
    note: 'White, with a soft white neck. Quiet on a light desk.',
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
 * The colourway ids, derived rather than retyped. Every colour the site
 * shows: the hero's swatches, the lineup and the colour section all pick
 * from these.
 */
export const SHELL_IDS = SHELLS.map((s) => s.id) as [string, ...string[]]

/**
 * What can actually be ordered today, which is not the same as what is shown.
 *
 * All five are modelled and photographed, but only black and white are being
 * printed for the first batch, so those are the only two the order form
 * offers and the only two the schema accepts. Showing a colour is a picture;
 * selling it is a promise, and the promise is the narrower list.
 *
 * Adding a colour back to the batch means adding its id here — nowhere else.
 */
export const ORDERABLE_SHELL_IDS = ['graphite', 'bone'] as [string, ...string[]]

export const ORDERABLE_SHELLS = SHELLS.filter((s) => ORDERABLE_SHELL_IDS.includes(s.id))

export const isOrderableShell = (id: string): boolean => ORDERABLE_SHELL_IDS.includes(id)

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

/** The live lineup and its renders: one robot in each colourway. */
export const LINEUP = ['graphite', 'bone', 'ember', 'signal', 'moss'] as const
