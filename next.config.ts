import type { NextConfig } from 'next'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The renders' version stamp (lib/renders.ts), written by tools/assets/build-site.mjs. */
const RENDER_VERSION: string = JSON.parse(readFileSync(join(__dirname, 'lib/render-version.json'), 'utf8')).v

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // the dev overlay sits exactly where the mobile buy bar does
  devIndicators: false,
  // Pin the workspace root; the home directory above holds an unrelated lockfile.
  turbopack: { root: __dirname },
  /**
   * How long a browser may keep what it has already downloaded.
   *
   * Everything under public/ was being served `max-age=0, must-revalidate`,
   * which is Next's default and means a repeat visitor revalidates every
   * render, every poster frame and the Amazon logo on every single load.
   * Lighthouse put 182 KiB on it; the real cost is a round trip per file
   * before anything can paint.
   *
   * Two tiers, because the assets differ in whether their name can change:
   *
   *   - renders and shots carry ?v=<stamp> (lib/renders.ts), so a new render
   *     is a new URL and the old one can be kept for ever;
   *   - films, voice and brand marks keep their filename when they are
   *     replaced, so they get a day of freshness and a month of
   *     stale-while-revalidate: a re-encoded film still reaches people, one
   *     visit later, without anybody holding a stale one for a year.
   */
  async headers() {
    const forever = 'public, max-age=31536000, immutable'
    const aDay = 'public, max-age=86400, stale-while-revalidate=2592000'
    return [
      { source: '/media/render/:path*', headers: [{ key: 'Cache-Control', value: forever }] },
      { source: '/media/shots/:path*', headers: [{ key: 'Cache-Control', value: forever }] },
      { source: '/media/films/:path*', headers: [{ key: 'Cache-Control', value: aDay }] },
      { source: '/media/voice/:path*', headers: [{ key: 'Cache-Control', value: aDay }] },
      { source: '/brand/:path*', headers: [{ key: 'Cache-Control', value: aDay }] },
    ]
  },
  images: {
    // 75 is the default for everything. 90 is for the product photographs, where
    // the printed shell's texture and the screen's edges are the detail that
    // matters, and 75 visibly softens both. Next 16 serves only listed values.
    qualities: [75, 90],
    // The default is WebP alone, so AVIF was never served however the
    // browser asked. Order matters: the first match in this array wins, so
    // AVIF is preferred and WebP is the fallback for anything that cannot
    // take it. On this page the product photographs are the payload, and
    // AVIF is meaningfully smaller on exactly that kind of image.
    formats: ['image/avif', 'image/webp'],
    // Renders carry ?v=<stamp> so a re-render reaches every cache at once
    // (lib/renders.ts). Everything else stays query-free, as before.
    localPatterns: [
      { pathname: '/media/render/**', search: `?v=${RENDER_VERSION}` },
      { pathname: '/media/shots/**', search: `?v=${RENDER_VERSION}` },
      { pathname: '/**', search: '' },
    ],
  },
}

export default nextConfig
