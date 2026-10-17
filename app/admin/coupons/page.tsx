import type { Metadata } from 'next'
import { listCoupons } from '@/lib/coupons'
import { adminConfigured } from '@/lib/admin-auth'
import CouponAdmin from './CouponAdmin'

/**
 * The codes, and a form to make another.
 *
 * Reached only through the proxy's Basic auth. Never indexed, never linked
 * from the site.
 */
export const metadata: Metadata = {
  title: 'Coupons · PebbleRobo',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CouponsPage() {
  if (!adminConfigured()) {
    return (
      <main className="wrap" style={{ paddingBlock: '56px 96px' }}>
        <h1 className="t-display text-[28px] mt-0 mb-3">Back office is closed</h1>
        <p className="text-[var(--muted)] m-0">
          Set <code>ADMIN_PASSWORD</code> on this deployment to open it.
        </p>
      </main>
    )
  }

  const coupons = await listCoupons()
  return <CouponAdmin initial={coupons} />
}
