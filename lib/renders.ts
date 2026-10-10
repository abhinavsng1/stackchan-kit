import stamp from '@/lib/render-version.json'

/**
 * A render's URL, stamped with the build that made it.
 *
 * next/image keeps an optimised copy of each image for hours, in its own
 * cache and in the browser's, keyed by URL. Re-rendering a file in place
 * left visitors on the old picture until that ran out. The stamp is a hash
 * of every render, written by tools/assets/build-site.mjs, so the URL — and
 * so every cache — changes exactly when a render does. next.config.ts allows
 * this one query string on these paths.
 */
export const RENDER_VERSION: string = stamp.v
export const rendered = (path: string) => `${path}?v=${RENDER_VERSION}`
