'use client'

import { useState } from 'react'
import CheckoutButton from '@/components/CheckoutButton'
import CouponField, { type Applied } from '@/components/CouponField'
import { PRICE } from '@/lib/kit'
import type { Plan } from '@/lib/plans'
import { EMI_TERMS, emiFromLine } from '@/lib/emi'

/**
 * The payment page's interactive half: how to pay, a code, and the button.
 *
 * Every figure shown here is a copy of one the server will compute again
 * before it charges anything. That is deliberate duplication — the page has
 * to show a total before the payment window opens — but it means the numbers
 * here are a preview, and `create-order` is the only thing that decides what
 * is actually charged.
 */

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`

export default function CheckoutPanel({ token, qty = 1 }: { token: string; qty?: number }) {
  const [plan, setPlan] = useState<Plan>('deposit')
  const [applied, setApplied] = useState<Applied | null>(null)

  const discount = applied?.discountPaise ?? 0
  const list = (PRICE.depositPaise + PRICE.balancePaise) * qty
  const now = plan === 'full'
    ? Math.max(100, list - discount)
    : PRICE.depositPaise * qty
  const onDelivery = plan === 'full'
    ? 0
    : Math.max(0, PRICE.balancePaise * qty - discount)

  const option = (value: Plan, title: string, detail: string) => {
    const chosen = plan === value
    return (
      <button
        type="button"
        role="radio"
        aria-checked={chosen}
        onClick={() => setPlan(value)}
        className="text-left cursor-pointer w-full p-4"
        style={{
          borderRadius: 14,
          border: `1px solid ${chosen ? 'var(--ink)' : 'var(--line)'}`,
          background: chosen ? 'var(--surface)' : 'transparent',
        }}
      >
        <span className="block text-[15px] font-medium">{title}</span>
        <span className="block text-[13.5px] mt-1" style={{ color: 'var(--muted)' }}>{detail}</span>
      </button>
    )
  }

  return (
    <div className="card p-6 mb-6">
      <div role="radiogroup" aria-label="How to pay" className="grid gap-2.5 sm:grid-cols-2 mb-5">
        {option('deposit', `Book for ${rupees(PRICE.depositPaise * qty)}`,
          `${rupees(PRICE.balancePaise * qty)} in cash when it is delivered`)}
        {option('full', `Pay ${rupees(list)} now`,
          `Nothing to pay at the door. ${EMI_TERMS.availability}`)}
      </div>

      <div className="flex items-baseline justify-between gap-4 pb-4 mb-4"
           style={{ borderBottom: '1px solid var(--line)' }}>
        <span className="text-[15px]">PebbleRobo × {qty}</span>
        <span className="t-mono text-[15px]">{rupees(list)}</span>
      </div>

      {discount > 0 && (
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <span className="text-[14px]" style={{ color: 'var(--muted)' }}>
            {applied?.code}
          </span>
          <span className="t-mono text-[14px]" style={{ color: 'var(--accent-ink)' }}>
            −{rupees(discount)}
          </span>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px] font-medium">Pay now</span>
        <span className="t-display text-[26px] leading-none">{rupees(now)}</span>
      </div>
      <p className="text-[14px] mt-2 mb-5" style={{ color: 'var(--muted)' }}>
        {onDelivery > 0
          ? `${rupees(onDelivery)} is collected in cash when it is delivered.`
          : 'Nothing is collected on delivery.'}
      </p>

      <CheckoutButton token={token} qty={qty} plan={plan} coupon={applied?.code ?? null} />

      {plan === 'full' && emiFromLine() && (
        <p className="text-[13px] mt-3 mb-0" style={{ color: 'var(--muted)' }}>
          {emiFromLine()}. {EMI_TERMS.noCost}
        </p>
      )}

      <CouponField plan={plan} qty={qty} onApplied={setApplied} />
    </div>
  )
}
