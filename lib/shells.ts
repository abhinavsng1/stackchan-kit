/**
 * The colourways.
 *
 * One list, used by the live robot, the renders, the hero's swatches and the
 * colour section. A second copy would drift, and the failure is silent: a
 * swatch whose colours no longer match the render it points at.
 *
 * Each colourway colours the three printed parts on their own — the head
 * shell, the neck (with its covers) and the base — so a colourway can be a
 * considered combination rather than one colour poured over everything. The
 * face module is a stock M5Stack part and keeps its real grey whatever the
 * colourway: the renders must not show a robot nobody can buy.
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
    id: 'ember', name: 'Ember', hex: '#d2552f',
    head: '#d2552f', neck: '#2b2d31', base: '#d2552f',
    note: 'Burnt orange, with a graphite neck. The loud one.',
  },
  {
    id: 'signal', name: 'Signal', hex: '#5ccfd4',
    head: '#5ccfd4', neck: '#ece8df', base: '#ece8df',
    note: 'A cyan head on a bone body. Bright, never shouty.',
  },
  {
    id: 'moss', name: 'Moss', hex: '#7f9b55',
    head: '#7f9b55', neck: '#ece8df', base: '#4b5a35',
    note: 'Moss on a deep olive base, with a bone neck. Grown, not made.',
  },
]

