/** Keep preview builds and local development out of the live conversion funnel. */
export function analyticsMode(): 'live' | 'test' | 'off' {
  if (typeof window === 'undefined') return 'off'
  const hostname = window.location.hostname.toLowerCase()
  if (hostname === 'pebblerobo.com' || hostname === 'www.pebblerobo.com') return 'live'

  // Browser tests inspect an in-memory Pixel queue; they never load either SDK.
  const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  return local && process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE === '1' ? 'test' : 'off'
}
