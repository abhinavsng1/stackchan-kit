/**
 * Scroll position → frame number, for a sticky sequence.
 *
 * A section taller than the viewport holds a pinned child. How far the
 * section has travelled past the top of the screen is the sequence's
 * progress, and the progress picks the frame. Both steps are here, as plain
 * arithmetic, because the interesting failures are arithmetic ones: a frame
 * index one past the end renders an empty device, and a progress that never
 * quite reaches 1 leaves the last frame unreachable however far you scroll.
 *
 * Nothing in here touches the DOM, so it can be tested without one.
 */

/** Clamp, and treat NaN as the start rather than propagating it. */
function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/**
 * How far through the pinned stretch we are, 0 to 1.
 *
 * @param scrolled  Pixels the section's top has travelled above the viewport top.
 * @param sectionH  The section's full height.
 * @param viewportH The viewport height.
 */
export function progressIn(scrolled: number, sectionH: number, viewportH: number) {
  // The pinned child occupies one viewport, so the travel available is
  // whatever height is left over. A section shorter than the viewport has
  // none, and dividing by it would produce Infinity.
  const travel = sectionH - viewportH
  if (travel <= 0) return 0
  return clamp01(scrolled / travel)
}

/** Which frame of `count` is showing at this progress. */
export function indexForProgress(progress: number, count: number) {
  if (count <= 1) return 0
  const i = Math.floor(clamp01(progress) * count)
  // progress === 1 lands exactly on `count`, which is one past the end.
  return i >= count ? count - 1 : i
}
