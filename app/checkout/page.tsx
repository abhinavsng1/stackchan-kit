import type { Metadata } from 'next'
import CheckoutButton from '@/components/CheckoutButton'
import { CONTACT, PRICE } from '@/lib/kit'

/**
 * Where a confirmed reservation gets paid for.
 *
 * Deliberately not linked from the product page: reserving is still free, and
 * this is the page the confirmation email points at once a batch is ready.
 */
export const metadata: Metadata = {
  title: 'Complete your reservation · Pebble-chan',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage(
  { searchParams }: { searchParams: Promise<{ t?: string }> },
) {
  const { t } = await searchParams

  // No token means this page was reached directly rather than from the link we
  // emailed. There is nothing to pay for, and nothing is revealed about
  // whether any given token exists.
  if (!t) {
    return (
      <main className="wrap" style={{ paddingBlock: '56px 96px' }}>
        <div className="max-w-[520px]">
          <p className="t-label m-0 mb-3">Payment</p>
          <h1 className="t-display text-[clamp(24px,4vw,34px)] mt-0 mb-3">
            Open this from your email
          </h1>
          <p className="text-[var(--muted)] mt-0 mb-0">
            Payment links are sent to the address you reserved with, once your
            batch is ready. If you are expecting one and it has not arrived,
            write to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="wrap" style={{ paddingBlock: '56px 96px' }}>
      <div className="max-w-[560px]">
        <p className="t-label m-0 mb-3">Payment</p>
        <h1 className="t-display text-[clamp(26px,4vw,38px)] mt-0 mb-3">
          Complete your reservation
        </h1>
        <p className="text-[var(--muted)] mt-0 mb-8">
          Your kit is boxed and ready to ship. Paying here confirms it and starts
          dispatch — {PRICE.ship.toLowerCase()}.
        </p>

        <div className="card p-6 mb-6">
          <div className="flex items-baseline justify-between gap-4 pb-4 mb-4"
               style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-[15px]">Pebble-chan kit × 1</span>
            <span className="t-display text-[26px] leading-none">{PRICE.now}</span>
          </div>
          <CheckoutButton token={t} />
        </div>

        <p className="text-[13.5px] text-[var(--muted)] m-0">
          Card, UPI, netbanking and EMI are all accepted. Payments are handled by
          Razorpay — we never see your card details. Questions? Write to{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </div>
    </main>
  )
}
