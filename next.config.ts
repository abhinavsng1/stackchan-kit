import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // the dev overlay sits exactly where the mobile buy bar does
  devIndicators: false,
  // Pin the workspace root; the home directory above holds an unrelated lockfile.
  turbopack: { root: __dirname },
}

export default nextConfig
