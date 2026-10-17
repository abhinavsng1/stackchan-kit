import type { Metadata } from 'next'
import Link from 'next/link'
import { listOrders, GROUP_LABEL, GROUPS } from '@/lib/admin-orders'
import { listCoupons } from '@/lib/coupons'
import { adminConfigured } from '@/lib/admin-auth'
import AdminNav from './AdminNav'

/**
 * One way in.
 *
 * What this page is for: answering "is there anything to do today?" without
 * reading a table. Everything it shows is a count or a sum, and every count
 * links to the list it came from.
 */
export const metadata: Metadata = {
  title: 'Back office · PebbleRobo',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`

export default async function AdminHome() {
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

  const [all, coupons] = await Promise.all([listOrders(), listCoupons()])
  const orders = all.filter((o) => !o.archivedAt)

  const counts = Object.fromEntries(GROUPS.map((g) => [g, orders.filter((o) => o.group === g).length]))
  const taken = orders.reduce((n, o) => n + o.paidPaise, 0)
  const owed = orders.reduce((n, o) => n + (o.group === 'balance_due' ? o.duePaise : 0), 0)
  const review = orders.filter((o) => o.needsReview).length
  const activeCodes = coupons.filter((c) => c.active).length
  const redeemed = coupons.reduce((n, c) => n + c.redeemed, 0)

  /** Anything that is somebody's job today, in the order it should be done. */
  const todo = [
    counts.unpaid ? { n: counts.unpaid, what: 'unpaid, waiting to be chased', to: '/admin/orders' } : null,
    counts.balance_due ? { n: counts.balance_due, what: 'owe cash at the door', to: '/admin/orders' } : null,
    review ? { n: review, what: 'need a person to look', to: '/admin/orders' } : null,
  ].filter(Boolean) as { n: number; what: string; to: string }[]

  return (
    <main className="wrap" style={{ paddingBlock: '48px 96px' }}>
      <p className="t-label m-0 mb-2">PebbleRobo</p>
      <h1 className="t-display text-[clamp(26px,4vw,34px)] mt-0 mb-6">Back office</h1>
      <AdminNav here="home" />

      <div className="grid gap-5 sm:grid-cols-3 mb-10">
        <Figure label="Taken" value={rupees(taken)} />
        <Figure label="Still owed at the door" value={rupees(owed)} />
        <Figure label="Orders" value={String(orders.length)} />
      </div>

      {todo.length > 0 && (
        <div className="card p-6 mb-10" style={{ maxWidth: 640 }}>
          <p className="t-label m-0 mb-3">To do</p>
          <ul className="list-none p-0 m-0 grid gap-2">
            {todo.map((t) => (
              <li key={t.what} className="text-[15px]">
                <Link href={t.to} style={{ color: 'var(--ink)' }}>
                  <strong className="font-medium">{t.n}</strong> {t.what}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2" style={{ maxWidth: 760 }}>
        <Card
          to="/admin/orders"
          title="Orders"
          lines={[
            ...GROUPS.map((g) => `${counts[g]} ${GROUP_LABEL[g].toLowerCase()}`),
            'Open a row to see the whole record, mark it paid, archive it or delete it.',
          ]}
        />
        <Card
          to="/admin/coupons"
          title="Coupons"
          lines={[
            `${activeCodes} active of ${coupons.length}`,
            `${redeemed} redeemed`,
            'Make a code, retire one, see what each has sold.',
          ]}
        />
      </div>

      <p className="text-[13px] mt-10 mb-0" style={{ color: 'var(--muted)' }}>
        Archived orders are left out of every figure here. Codes are counted when a
        payment settles, never when one is typed.
      </p>
    </main>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="t-label m-0 mb-1.5">{label}</p>
      <p className="t-display text-[30px] m-0 leading-none">{value}</p>
    </div>
  )
}

function Card({ to, title, lines }: { to: string; title: string; lines: string[] }) {
  return (
    <Link href={to} className="card p-6 no-underline block" style={{ color: 'var(--ink)' }}>
      <p className="t-display text-[22px] mt-0 mb-3">{title} →</p>
      <ul className="list-none p-0 m-0 grid gap-1.5">
        {lines.map((l) => (
          <li key={l} className="text-[14px]" style={{ color: 'var(--muted)' }}>{l}</li>
        ))}
      </ul>
    </Link>
  )
}
