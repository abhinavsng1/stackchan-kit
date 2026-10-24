import type { Metadata } from 'next'
import { adminConfigured } from '@/lib/admin-auth'
import { listStock, recentMoves } from '@/lib/inventory'
import InventoryAdmin from './InventoryAdmin'

/**
 * Stock, reached only through the proxy's Basic auth.
 */
export const metadata: Metadata = {
  title: 'Stock · PebbleRobo',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
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

  const [shelf, moves] = await Promise.all([listStock(), recentMoves()])
  return <InventoryAdmin initial={{ ...shelf, moves }} />
}
