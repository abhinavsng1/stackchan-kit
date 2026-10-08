/**
 * The shell colours.
 *
 * One list, used by the render pipeline, the hero's live model and the
 * colourway section. A second copy would drift, and the failure is silent:
 * a swatch whose hex no longer matches the render it points at.
 */
export type Shell = { id: string; name: string; hex: string }

export const SHELLS: Shell[] = [
  { id: 'graphite', name: 'Graphite', hex: '#2b2d31' },
  { id: 'bone', name: 'Bone', hex: '#e9e6df' },
  { id: 'signal', name: 'Signal', hex: '#5ce1e6' },
  { id: 'ember', name: 'Ember', hex: '#d2552f' },
  { id: 'moss', name: 'Moss', hex: '#7f9b55' },
]
