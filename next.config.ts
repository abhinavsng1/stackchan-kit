import type { NextConfig } from 'next'

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
  },
}

export default nextConfig
