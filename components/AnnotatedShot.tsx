import Image from 'next/image'

/**
 * A photograph with its parts called out.
 *
 * The chips sit in HTML rather than being baked into the image, for three
 * reasons: the text stays selectable and readable by a screen reader, it
 * re-renders at any size without going soft, and a spec can be corrected
 * without re-exporting a photograph.
 *
 * Positions are percentages of the frame, so they hold at every width. On a
 * phone there is no room to float anything over a photograph without covering
 * the product, so below `sm` the chips stop floating and become a list under
 * the image — the same facts, laid out where there is space for them.
 */
export type Chip = {
  /** Percentage from the left and top of the frame. */
  x: number
  y: number
  label: string
  value: string
  /** Which way the connector points. Defaults to left. */
  from?: 'left' | 'right'
}

export default function AnnotatedShot({
  src, alt, chips, width = 1080, height = 1350, priority = false, caption,
  imageWidth = 100,
}: {
  src: string
  alt: string
  chips: Chip[]
  width?: number
  height?: number
  priority?: boolean
  caption?: string
  /**
   * How much of the frame's width the photograph takes, as a percentage.
   *
   * Every photograph here is 4:5 portrait, so a callout has nowhere to go
   * inside one without covering the robot. Below 100 the panel is wider than
   * the picture and the chips live in the space beside it, which is what the
   * composition wants anyway: product off-centre, facts in the air next to it.
   */
  imageWidth?: number
}) {
  const inset = imageWidth < 100
  return (
    <figure className="m-0">
      {/* Two boxes on purpose. The inner one clips the photograph to its
          rounded corners; the outer one does not clip at all, so a chip may
          hang over the edge of the frame — which is the point of a callout.
          With one box the overflow that rounds the picture also guillotines
          every label. */}
      <div
        className="relative"
        style={inset ? {
          borderRadius: 'var(--radius-tile)',
          background:
            'radial-gradient(90% 70% at 30% 45%, var(--signal-wash) 0%, transparent 62%),'
            + ' linear-gradient(160deg, var(--surface) 0%, var(--surface-2) 72%)',
          border: '1px solid var(--line-soft)',
          padding: 'clamp(20px, 4vw, 56px)',
        } : undefined}
      >
        <div className="relative overflow-hidden mx-auto sm:mx-0"
             style={{
               borderRadius: 'var(--radius-tile)',
               background: 'var(--pebble-black)',
               width: inset ? `${imageWidth}%` : undefined,
             }}>
        <Image
          src={src} alt={alt} width={width} height={height} priority={priority}
          sizes="(max-width: 768px) 94vw, 520px"
          quality={90}
          className="w-full h-auto block"
        />

        {/* A vignette, drawn rather than baked, so the photograph underneath
            is untouched and the chips always have something to sit on. */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(120% 90% at 50% 45%, transparent 42%, color-mix(in srgb, var(--ink) 22%, transparent) 100%)' }} />
        </div>

        {chips.map((c) => (
          <div
            key={c.label}
            className="hidden sm:flex absolute items-center gap-2.5"
            style={{
              left: `${c.x}%`, top: `${c.y}%`,
              transform: `translate(${c.from === 'right' ? '-100%' : '0'}, -50%)`,
              flexDirection: c.from === 'right' ? 'row-reverse' : 'row',
            }}
          >
            {/* The dot is the anchor; the chip hangs off it. Without it a
                floating label points at nothing in particular. */}
            <span className="block flex-none"
                  style={{
                    width: 7, height: 7, borderRadius: 999,
                    background: 'var(--signal)',
                    boxShadow: '0 0 0 4px rgba(169,207,81,.18)',
                  }} />
            <span className="block flex-none" aria-hidden="true"
                  style={{ width: 26, height: 1, background: 'rgba(246,246,244,.35)' }} />
            <span className="px-3 py-2 backdrop-blur-md whitespace-nowrap"
                  style={{
                    borderRadius: 10,
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    boxShadow: 'var(--sh-md)',
                  }}>
              <span className="t-mono block text-[10px] uppercase"
                    style={{ letterSpacing: '.14em', color: 'var(--muted)' }}>
                {c.label}
              </span>
              <span className="t-mono block text-[12.5px] mt-0.5" style={{ color: 'var(--ink)' }}>
                {c.value}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Below sm the same facts, as a list. A chip floated over a phone-width
          photograph covers the thing it is pointing at. */}
      <ul className="sm:hidden grid grid-cols-2 gap-x-4 gap-y-3 list-none p-0 mt-4 mb-0">
        {chips.map((c) => (
          <li key={c.label}>
            <span className="t-mono block text-[10px] uppercase"
                  style={{ letterSpacing: '.14em', color: 'var(--muted)' }}>
              {c.label}
            </span>
            <span className="t-mono block text-[12.5px] mt-0.5">{c.value}</span>
          </li>
        ))}
      </ul>

      {caption && (
        <figcaption className="t-mono text-[11px] mt-3" style={{ color: 'var(--muted)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
