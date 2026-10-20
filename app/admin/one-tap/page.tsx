import type { Metadata } from 'next'
import { listMagicOrders } from '@/lib/magic-orders'
import { adminConfigured } from '@/lib/admin-auth'
import AdminNav from '@/app/admin/AdminNav'
import { rupees } from '@/lib/plans'

/**
 * Every one-tap attempt, paid or not.
 *
 * The orders table only shows bookings, and a booking only exists once a
 * payment has been recorded. So a one-tap window that opened, priced itself
 * and then went nowhere left no trace anybody could see — which is exactly
 * the failure we spent an evening chasing. This is where those live.
 *
 * Read-only on purpose. Nothing here is a sale; it is the paper trail that
 * explains why a sale did or did not become one.
 */

export const metadata: Metadata = {
  title: 'One-tap attempts · PebbleRobo',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const when = (d: Date | null) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default async function OneTapPage() {
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

  const rows = await listMagicOrders()
  const paid = rows.filter((r) => r.status === 'paid').length

  return (
    <main className="wrap" style={{ paddingBlock: '48px 96px' }}>
      <p className="t-label m-0 mb-2">Back office</p>
      <h1 className="t-display text-[clamp(26px,4vw,34px)] mt-0 mb-6">One-tap attempts</h1>
      <AdminNav here="one-tap" />

      <p className="text-[14px] mt-0 mb-6" style={{ color: 'var(--muted)' }}>
        {rows.length} attempt{rows.length === 1 ? '' : 's'}, {paid} paid. An attempt
        still showing <strong>created</strong> means Razorpay took the order and the
        payment never reached us — either the buyer closed the window, or the webhook did not arrive.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Started', 'Status', 'Plan', 'Qty', 'Colour', 'Charged', 'At the door', 'Buyer', 'Razorpay order']
                .map((h) => (
                  <th key={h} className="t-label text-left py-2.5 pr-4 font-normal">{h}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="py-6" style={{ color: 'var(--muted)' }}>
                Nothing yet. The one-tap window is behind <code>?magic=1</code>.
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.orderId} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <td className="py-3 pr-4 whitespace-nowrap">{when(r.createdAt)}</td>
                <td className="py-3 pr-4">
                  <span style={{ color: r.status === 'paid' ? 'var(--ink)' : 'var(--muted)' }}>
                    {r.status === 'paid' ? `paid · ${when(r.paidAt)}` : r.status}
                  </span>
                </td>
                <td className="py-3 pr-4">{r.plan}</td>
                <td className="py-3 pr-4">{r.qty}</td>
                <td className="py-3 pr-4">{r.shell ?? '—'}</td>
                <td className="py-3 pr-4">{rupees(r.amountPaise)}</td>
                <td className="py-3 pr-4">{r.balanceDuePaise ? rupees(r.balanceDuePaise) : '—'}</td>
                <td className="py-3 pr-4">
                  {r.email ?? r.contact ?? <span style={{ color: 'var(--muted)' }}>not seen yet</span>}
                </td>
                <td className="py-3 pr-4 t-mono text-[12.5px]">{r.orderId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[13px] mt-8 mb-0" style={{ color: 'var(--muted)' }}>
        A paid attempt also appears in Orders as a real booking. If one shows paid here
        and is missing there, the booking failed to write and the logs will say why.
      </p>
    </main>
  )
}
