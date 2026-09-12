import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root; the home directory above holds an unrelated lockfile.
  turbopack: { root: __dirname },
}

export default nextConfig
