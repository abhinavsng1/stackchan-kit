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

  /*
   * A row still reading 'created' a while after it was made is the shape of
   * the failure that cost us two sales tonight: Razorpay took the money and
   * nothing on our side ever heard. Within a few minutes it means nothing —
   * somebody is still typing their address. So the table separates the two
   * by the clock rather than making a person work it out from timestamps.
   */
  const STALE_AFTER_MS = 30 * 60 * 1000
  const stalled = (r: { status: string; createdAt: Date }) =>
    r.status === 'created' && Date.now() - r.createdAt.getTime() > STALE_AFTER_MS

  const paid = rows.filter((r) => r.status === 'paid').length
  const abandoned = rows.filter((r) => r.status === 'abandoned').length
  const stuck = rows.filter(stalled).length
  const live = rows.length - paid - abandoned - stuck

  const label = (r: { status: string; paidAt: Date | null; createdAt: Date }) => {
    if (r.status === 'paid') return `paid · ${when(r.paidAt)}`
    if (r.status === 'abandoned') return 'abandoned'
    return stalled(r) ? 'never confirmed' : 'in progress'
  }

  const colour = (r: { status: string; createdAt: Date }) => {
    if (r.status === 'paid') return 'var(--ink)'
    if (stalled(r)) return 'var(--danger)'
    return 'var(--muted)'
  }

  return (
    <main className="wrap" style={{ paddingBlock: '48px 96px' }}>
      <p className="t-label m-0 mb-2">Back office</p>
      <h1 className="t-display text-[clamp(26px,4vw,34px)] mt-0 mb-6">One-tap attempts</h1>
      <AdminNav here="one-tap" />

      <div className="flex flex-wrap gap-x-7 gap-y-2 mb-5">
        {([
          ['Paid', paid, 'var(--ink)'],
          ['Abandoned', abandoned, 'var(--muted)'],
          ['Never confirmed', stuck, stuck > 0 ? 'var(--danger)' : 'var(--muted)'],
          ['In progress', live, 'var(--muted)'],
        ] as const).map(([name, n, c]) => (
          <div key={name}>
            <p className="t-label m-0 mb-1">{name}</p>
            <p className="t-mono text-[22px] m-0" style={{ color: c }}>{n}</p>
          </div>
        ))}
      </div>

      <p className="text-[14px] mt-0 mb-6" style={{ color: 'var(--muted)' }}>
        <strong>Abandoned</strong> is a buyer who opened the window and closed it without
        paying — worth following up where there is an email beside it.{' '}
        <strong style={{ color: stuck > 0 ? 'var(--danger)' : 'inherit' }}>Never confirmed</strong>{' '}
        is different and worse: half an hour on and we still have not been told what
        happened, so the money may well have moved without us hearing. Check those against
        the Razorpay dashboard.
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
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span style={{ color: colour(r) }}>{label(r)}</span>
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
        and is missing there, the booking failed to write and the logs will say why. An
        abandoned row with an email beside it is a checkout to go and finish.
      </p>
    </main>
  )
}
