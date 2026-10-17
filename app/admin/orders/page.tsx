import type { Metadata } from 'next'
import { listOrders } from '@/lib/admin-orders'
import { adminConfigured } from '@/lib/admin-auth'
import { siteUrl } from '@/lib/email'
import OrdersTable from './OrdersTable'

/**
 * Who has ordered, who still owes, and who to chase.
 *
 * Behind the proxy's Basic auth, never indexed, never linked.
 */
export const metadata: Metadata = {
  title: 'Orders · PebbleRobo',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
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

  return <OrdersTable initial={await listOrders()} siteUrl={siteUrl()} />
}
