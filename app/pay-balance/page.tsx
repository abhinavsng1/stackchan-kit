import type { Metadata } from 'next'
import { CONTACT } from '@/lib/kit'
import { findBalanceByToken } from '@/lib/preorders'
import { prepayBalance } from '@/lib/plans'
import BalancePanel from '@/components/BalancePanel'

/**
 * Settle the cash balance before the box ships.
 *
 * Reached from one email, with the booking's own token. Nothing here is
 * guessable and nothing is indexed: the page says what this specific booking
 * owes, which is more than a stranger should be able to ask for.
 */
export const metadata: Metadata = {
  title: 'Pay the balance · PebbleRobo',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="wrap" style={{ paddingBlock: '56px 96px' }}>
      <div className="max-w-[560px]">
        <p className="t-label m-0 mb-3">Balance</p>
        <h1 className="t-display text-[clamp(26px,4vw,38px)] mt-0 mb-3">{title}</h1>
        {children}
      </div>
    </main>
  )
}

export default async function PayBalancePage(
  { searchParams }: { searchParams: Promise<{ t?: string }> },
) {
  const { t } = await searchParams

  if (!t) {
    return (
      <Shell title="Open this from your email">
        <p className="text-[var(--muted)] mt-0 mb-0">
          We email this link when a batch is about to ship. If you are expecting one and
          it has not arrived, write to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </Shell>
    )
  }

  const booking = await findBalanceByToken(t)

  // An unknown token and a booking with nothing owing are answered the same
  // way wherever it is safe to: neither tells a stranger that a token exists.
  if (!booking || !booking.paidAt) {
    return (
      <Shell title="This link is not valid">
        <p className="text-[var(--muted)] mt-0 mb-0">
          Check the link in your email, or write to{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </Shell>
    )
  }

  if (booking.balancePaidAt || booking.balanceDuePaise <= 0) {
    return (
      <Shell title="Nothing left to pay">
        <p className="text-[var(--muted)] mt-0 mb-0">
          This booking is paid in full. The courier collects nothing at the door.
        </p>
      </Shell>
    )
  }

  const { incentivePaise } = prepayBalance(booking.balanceDuePaise)

  return (
    <Shell title="Settle it now, or at the door">
      <p className="text-[var(--muted)] mt-0 mb-8">
        Your PebbleRobo is about to ship. You can pay the balance here and have the
        courier hand it over with nothing to collect — or keep the cash arrangement.
      </p>
      <BalancePanel
        token={t}
        name={booking.name.split(/\s+/)[0] ?? ''}
        duePaise={booking.balanceDuePaise}
        incentivePaise={incentivePaise}
      />
    </Shell>
  )
}
