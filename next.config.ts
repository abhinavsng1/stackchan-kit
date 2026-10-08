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
