import Image from 'next/image'

/**
 * The pebble mark beside the name, typeset. The mark is the supplied artwork;
 * the name is set in the page's own face so it sits on the same baseline as
 * everything else rather than as a picture of text.
 */
export default function Wordmark({ size = 22, invert = false }: { size?: number; invert?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 select-none" style={{ height: size }}>
      <Image src="/brand/mark.svg" alt="" width={Math.round(size * 1.26)} height={size}
             priority aria-hidden="true"
             style={{ height: size * 0.82, width: 'auto', filter: invert ? 'invert(1)' : undefined }} />
      <span className="t-display" style={{ fontSize: size * 0.92, letterSpacing: '-0.04em', lineHeight: 1 }}>
        PebbleRobo
      </span>
    </span>
  )
}
