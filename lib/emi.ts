/**
 * What this site may say about EMI, and what it may not.
 *
 * The account's position, as approved by Razorpay:
 *
 *   - credit-card EMI is live on most banks (SBI still pending);
 *   - debit-card EMI and cardless EMI were both rejected for this business;
 *   - one No-Cost EMI offer exists, three months, ICICI credit cards only,
 *     on orders of ₹4,999 and above.
 *
 * So every line of EMI copy on the site says "eligible credit cards", and the
 * No-Cost line names ICICI. "No cost EMI available" on its own would be a
 * claim this account cannot honour, and a buyer who picks their debit card
 * because the page implied it works finds out at the payment screen, which is
 * the worst possible place.
 *
 * These are constants rather than copy typed into components, so the claim
 * lives in one file and changes in one place when the account does.
 */

export const EMI_TERMS = {
  cards: 'eligible credit cards',
  availability: 'EMI is available on eligible credit cards at checkout.',
  noCost: 'No-Cost EMI on ICICI credit cards.',
  /** Shown wherever the monthly figure appears, so it is never read as a price. */
  caveat: 'Exact instalments depend on your bank.',
} as const

/**
 * The monthly figure, only when somebody has configured it.
 *
 * Deliberately not computed here. A real EMI instalment depends on the bank's
 * interest rate and tenure, and a figure this code worked out itself would be
 * a number nobody could stand behind. Set
 * NEXT_PUBLIC_EMI_FROM_MONTHLY_PAISE from what the gateway actually quotes;
 * leave it unset and the site says nothing about monthly amounts at all.
 */
export function emiFromMonthlyPaise(): number | null {
  const raw = process.env.NEXT_PUBLIC_EMI_FROM_MONTHLY_PAISE
  if (!raw) return null
  const paise = Number(raw)
  if (!Number.isFinite(paise) || paise <= 0) return null
  return Math.floor(paise)
}

export function emiFromLine(): string | null {
  const paise = emiFromMonthlyPaise()
  if (paise === null) return null
  const rupees = `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
  return `or from ${rupees}/month with EMI on ${EMI_TERMS.cards}`
}

/**
 * Razorpay's Affordability Widget, which quotes real bank offers on the page.
 *
 * Off unless NEXT_PUBLIC_AFFORDABILITY_WIDGET is 1, because it only works
 * once the feature is enabled on the Razorpay account, and a widget that
 * fails to load leaves a blank rectangle where a price should be.
 */
export function affordabilityWidgetEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AFFORDABILITY_WIDGET === '1'
}

/** The No-Cost EMI offer to attach to full-price orders, if one is configured. */
export function noCostEmiOfferId(): string | null {
  const id = process.env.RAZORPAY_NOCOST_EMI_OFFER_ID?.trim()
  return id ? id : null
}
