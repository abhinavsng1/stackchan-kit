import type { Shell } from '@/lib/shells'

/**
 * A colourway as a swatch: the head colour over the base colour, split on the
 * diagonal, with the neck as a thin ring between them — the three printed
 * parts, in the proportions you notice them.
 */
export default function Swatch({ way, size = 22 }: { way: Shell; size?: number }) {
  return (
    <span aria-hidden="true" className="block rounded-full overflow-hidden"
          style={{
            width: size, height: size,
            background: `linear-gradient(135deg, ${way.head} 0 50%, ${way.base} 50% 100%)`,
            boxShadow: `inset 0 0 0 2px ${way.neck}, inset 0 0 0 3px rgba(0,0,0,.10)`,
          }} />
  )
}
