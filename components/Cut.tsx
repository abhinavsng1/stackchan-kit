/**
 * The cut — the brand's single graphic gesture.
 *
 * The guidelines are specific and worth quoting: "Use its exact curve — 38°
 * easing to 10° — as a divider or to split an image. Once per layout, never
 * decorative repeats."
 *
 * So this is deliberately not a reusable flourish. It appears once on the
 * page, between the film and what the kit does, where the tone changes from
 * showing to explaining. Putting it anywhere else would make it decoration,
 * which is the one thing the brand says it must not become.
 *
 * The curve: a shallow quadratic entering at 38° and easing to roughly 10°
 * by the right edge. Drawn rather than approximated with a border-radius,
 * because the angle is the point.
 */
export default function Cut({ className = '' }: { className?: string }) {
  return (
    <div className={`wrap ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 64"
        className="w-full h-auto block"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path
          d="M0 56 Q 420 8 1200 2"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
