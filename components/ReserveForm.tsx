'use client'

import { useEffect, useRef, useState } from 'react'
import { preorderSchema, fieldErrors, PROFESSIONS } from '@/lib/schema'
import { EV, track, identifyPerson, recordPurchase } from '@/lib/analytics'
import { CONTACT, EDITION, PRICE, DEFAULT_EDITION, type Edition } from '@/lib/kit'
import { pricing, type Variant } from '@/lib/variants'
import { ORDERABLE_SHELLS, isOrderableShell, DEFAULT_SHELL } from '@/lib/shells'
import { quote, rupees, type Plan } from '@/lib/plans'
import { EMI_TERMS, emiFromLine } from '@/lib/emi'
import { useShell, setShell } from '@/lib/shell-store'
import Swatch from '@/components/site/Swatch'
import CouponField from '@/components/CouponField'
import EditionPicker from '@/components/EditionPicker'
import { openCheckout, CheckoutError } from '@/lib/checkout'
import { useEdition } from '@/lib/edition-store'
import { storedTwclid, xEvent } from '@/lib/x-pixel'

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'paying' }
  | { kind: 'paid'; paymentId: string }
  | { kind: 'already'; field: 'email' | 'phone' }
  /**
   * Details saved, money not taken. Deliberately its own state rather than a
   * variant of 'already' or a silent return to 'idle': this person has an
   * order sitting unpaid and the only useful thing the page can do is offer
   * to take the payment again.
   */
  | { kind: 'unpaid'; why: 'dismissed' | 'failed' | 'returning'; detail?: string }
  | { kind: 'error'; message: string }

const EMPTY: Record<string, string> = {}

export default function ReserveForm({ variant, chooseEdition = false }: {
  variant?: Variant
  /**
   * Offer the robot or the kit inside the form. Off on the home page, which
   * sells the robot; on at /kit, where both are on sale side by side.
   */
  chooseEdition?: boolean
} = {}) {
  /**
   * What this buyer actually owes on delivery.
   *
   * Hardcoding the kit's balance here put "₹4,500" under a form on a page
   * quoting ₹3,500 — the small print contradicting the price above it, which
   * is exactly where a buyer decides whether to trust the rest.
   */
  const [state, setState] = useState<State>({ kind: 'idle' })
  /**
   * How they want to pay, and what a code took off.
   *
   * Both live here rather than in the summary below because every figure on
   * this form depends on them — and because the plan has to travel with the
   * order, so the server charges for the thing the buyer was looking at.
   */
  const [plan, setPlan] = useState<Plan>('deposit')
  const [discountPaise, setDiscountPaise] = useState(0)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>(EMPTY)
  // Starts on a real colourway rather than empty, so the optional field is
  // optional in the sense that matters: ignoring it still produces an order.
  // Shared with every other colour control on the page (lib/shell-store.ts).
  // The hero shows all five colourways; only two are printed for this batch,
  // so a buyer who arrives having previewed Ember orders the default rather
  // than an order nobody can pack. The radio below shows what will be sent.
  const previewed = useShell()
  const shell = isOrderableShell(previewed) ? previewed : DEFAULT_SHELL
  const qtyRef = useRef<HTMLSelectElement>(null)
  // Mirrored in state as well as the ref, because the code field prices
  // against it and a ref read during render is both stale and wrong on the
  // server. The ref stays: the submit path reads the live DOM value.
  const [qty, setQty] = useState(1)

  // The same function the server prices with, so the form cannot show one
  // number and the payment window another.
  const q = quote(plan, qty, variant ?? null, discountPaise)
  const paysNow = rupees(q.nowPaise)
  const owed = rupees(q.balancePaise)
  const total = rupees(q.listPaise)
  const started = useRef(false)
  /**
   * Held so that closing the payment modal and pressing the button again
   * reopens it, rather than re-submitting an order that already exists and
   * being told the email is taken.
   */
  const token = useRef<string | null>(null)
  const edition = useEdition()
  /**
   * The edition as it was when the order was saved. The picker stays live
   * while the payment window is open, and what is reported as bought has to be
   * what the row says, not whatever the picker shows by then.
   */
  const ordered = useRef<Edition>(edition)
  /**
   * One id per order, made here, sent to our server and to the X pixel alike,
   * so the two reports of the same order are counted once. Random, so it says
   * nothing about the buyer.
   */
  const xid = useRef<string>('')

  // The buy box carries its quantity here, so nobody has to pick it twice.
  useEffect(() => {
    const onQty = (e: Event) => {
      const n = (e as CustomEvent<number>).detail
      if (qtyRef.current && n >= 1 && n <= 5) { qtyRef.current.value = String(n); setQty(n) }
    }
    window.addEventListener('sc:qty', onQty)
    return () => window.removeEventListener('sc:qty', onQty)
  }, [])

  /**
   * Details saved, payment not taken.
   *
   * This screen exists because the three ways a payment can fail to happen —
   * closing the modal, a declined card, and coming back a day later — all used
   * to end somewhere that told the buyer nothing useful. Two of them showed an
   * empty form, and the third said "already ordered", which reads as "you are
   * on the list" to somebody who has paid nothing and is on no list.
   *
   * So it says plainly that nothing has been charged, offers the payment
   * again, and gives a human to write to. No badge that could be mistaken for
   * a confirmation.
   */
  if (state.kind === 'unpaid') {
    return (
      <div className="card p-8" role="status">
        <span className="badge"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
          Not paid yet
        </span>

        <p className="t-display text-[30px] mt-4 mb-3">
          {state.why === 'returning'
            ? 'You started this booking. It is not paid for.'
            : 'Your details are saved. Nothing has been charged.'}
        </p>

        <p className="max-w-[50ch] text-[var(--muted)] m-0">
          {state.why === 'failed' && state.detail
            ? `${state.detail} Your details are saved, so you can try the payment again without filling anything in.`
            : state.why === 'returning'
              ? `We have your details from earlier. The ${PRICE.deposit} booking payment did not go through, so nothing is held for you yet.`
              : `The payment window closed before anything went through. Your PebbleRobo is not booked until the ${PRICE.deposit} is paid.`}
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-7">
          <button type="button" onClick={pay} className="btn btn-brand">
            Pay {PRICE.deposit} and book
          </button>
          <span className="t-mono text-[12px] text-[var(--muted)]">
            {PRICE.balance} on delivery · {PRICE.now} total
          </span>
        </div>

        <p className="text-[13px] leading-[21px] text-[var(--muted)] mt-6 mb-0 pt-5 border-t"
           style={{ borderColor: 'var(--line)' }}>
          Trouble paying, or want to change something on the order? Write to{' '}
          <a href={`mailto:${CONTACT.email}`}
             className="text-[var(--ink)] underline underline-offset-4">{CONTACT.email}</a>{' '}
          and we will sort it out by hand.
        </p>
      </div>
    )
  }

  if (state.kind === 'paid' || state.kind === 'already') {
    const byPhone = state.kind === 'already' && state.field === 'phone'
    return (
      <div className="card p-8" role="status">
        <span className="badge badge-brand"><span className="dot" />
          {state.kind === 'paid' ? 'Booked' : 'Already ordered'}
        </span>

        <p className="t-display text-[30px] mt-4 mb-3">
          {state.kind === 'paid'
            ? 'Your PebbleRobo is booked.'
            : byPhone
              ? 'That number has already ordered.'
              : 'That email has already ordered.'}
        </p>

        <p className="max-w-[48ch] text-[var(--muted)] m-0">
          {state.kind === 'paid' ? (
            <>Your {PRICE.deposit} is paid and a confirmation is on its way to your
            inbox. {PRICE.ship}, and we&apos;ll email tracking the moment it leaves.
            Keep <strong className="text-[var(--ink)]">{PRICE.balance} in cash</strong> ready
            for the courier. That is the rest of the {PRICE.now}, and they cannot
            take a card.</>
          ) : (
            <>We take one order per person per batch. To change the address on an existing
            order, or to order another, write to <a href={`mailto:${CONTACT.email}`}
              className="text-[var(--ink)] underline underline-offset-4">{CONTACT.email}</a>.</>
          )}
        </p>

        {state.kind === 'paid' && (
          <p className="t-mono text-[11.5px] text-[var(--muted)] mt-4 mb-0">
            Payment {state.paymentId}
          </p>
        )}
      </div>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Second press after a dismissed modal: the order exists, just reopen.
    if (token.current) return pay()
    const form = new FormData(event.currentTarget)
    const get = (k: string) => String(form.get(k) ?? '')
    const payload = {
      name: get('name'),
      email: get('email'),
      phone: get('phone'),
      profession: get('profession'),
      address: get('address'),
      city: get('city'),
      pincode: get('pincode'),
      qty: get('qty') || '1',
      edition: get('edition') || edition,
      twclid: storedTwclid(),
      xid: (xid.current ||= newOrderId()),
      company: get('company'),
      // The code as typed, and the plan chosen. What either is worth is
      // decided by the server.
      coupon: get('coupon'),
      plan: get('plan'),
      // Which price this buyer was shown. Absent on the kit page.
      ...(variant ? { variant } : {}),
    }

    // Fast local feedback. The server re-runs this and its answer is the one
    // that counts.
    const local = preorderSchema.safeParse(payload)
    if (!local.success) {
      const fields = fieldErrors(local.error)
      setErrors(fields)
      setState({ kind: 'idle' })
      // Which field is turning people away is the most actionable thing here.
      track(EV.reserveFieldInvalid, { fields: Object.keys(fields).sort().join(',') })
      return
    }

    setErrors(EMPTY)
    setState({ kind: 'submitting' })
    // Quantity and profession only. Never a name, email, phone or address.
    ordered.current = local.data.edition
    track(EV.reserveSubmitted, {
      qty: local.data.qty, profession: local.data.profession, edition: local.data.edition,
    })

    try {
      const res = await fetch('/api/preorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))

      if (res.status === 201) {
        // Now we know who this browser belongs to. Identifying here rather
        // than after payment means the anonymous history — what they read,
        // where they paused — merges into this person even if they never pay.
        // The whole record, not just the address: this profile exists so an
        // order that stops at checkout is still a person somebody can call.
        void identifyPerson({
          email: local.data.email,
          name: local.data.name,
          phone: local.data.phone,
          city: local.data.city,
          pincode: local.data.pincode,
          profession: local.data.profession,
          qty: local.data.qty,
          edition: local.data.edition,
        })
        track(EV.reserveSucceeded, { edition: local.data.edition })
        xEvent('lead', { conversion_id: xid.current })
        token.current = body.token ?? null
        return pay()
      }
      if (res.status === 409) {
        const field = body.field === 'phone' ? 'phone' : 'email'
        track(EV.reserveDuplicate, { field, paid: Boolean(body.paid) })
        // An order that was never paid for is somebody coming back to finish.
        if (!body.paid && typeof body.token === 'string' && body.token) {
          token.current = body.token
          return setState({ kind: 'unpaid', why: 'returning' })
        }
        return setState({ kind: 'already', field })
      }
      if (res.status === 400 && body.fields) {
        setErrors(body.fields)
        // Measured here as well as locally: a field the browser accepted and
        // the server refused is the most confusing kind of rejection, and
        // until now it was the one kind nobody could see.
        track(EV.reserveFieldInvalid, { fields: Object.keys(body.fields).sort().join(','), source: 'server' })
        return setState({ kind: 'idle' })
      }
      track(EV.reserveFailed, { status: res.status })
      setState({ kind: 'error', message: body.error ?? 'That did not go through. Try again.' })
    } catch {
      track(EV.reserveFailed, { status: 'network' })
      setState({ kind: 'error', message: 'No connection. Check your network and try again.' })
    }
  }

  /**
   * Opens checkout for the order just created. Separate from onSubmit so the
   * button can retry after a dismissed modal without creating a second order.
   */
  const local_qty = () => Number(qtyRef.current?.value ?? 1) || 1

  async function pay() {
    if (!token.current) {
      return setState({
        kind: 'error',
        message: `Your order is saved but payment could not start. Write to ${CONTACT.email}.`,
      })
    }
    setState({ kind: 'paying' })
    track(EV.paymentOpened)
    try {
      const outcome = await openCheckout({
        token: token.current,
        entity: CONTACT.entity,
        description: `${EDITION[ordered.current].name}, batch 01`,
        // Both are re-checked and re-priced server-side before anything is
        // charged; sending them keeps the window showing what the form did.
        plan,
        coupon: couponCode,
      })
      if (outcome.status === 'paid') {
        recordPurchase({ qty: local_qty(), edition: ordered.current })
        track(EV.paymentSucceeded, { qty: local_qty(), edition: ordered.current })
        // The server reports this sale too, under the same payment id.
        xEvent('purchase', {
          conversion_id: outcome.paymentId,
          value: (PRICE.nowPaise / 100) * local_qty(),
          currency: 'INR',
          contents: [{ content_id: EDITION[ordered.current].sku, num_items: local_qty() }],
        })
        return setState({ kind: 'paid', paymentId: outcome.paymentId })
      }
      if (outcome.status === 'dismissed') {
        // Nothing charged and the order is saved. Returning to 'idle' put the
        // empty form back and left no sign the order existed, so the only way
        // back to payment was to fill it in again — which collides with the
        // row they just created.
        track(EV.paymentDismissed)
        return setState({ kind: 'unpaid', why: 'dismissed' })
      }
      // Everything the gateway told us, so a dashboard can tell a declined
      // card apart from a key that stopped working for everybody.
      track(EV.paymentFailed, { outcome: outcome.status, ...outcome.detail })
      // 'unconfirmed' means the money may well have moved and we could not
      // verify it. Offering "pay again" there invites a double charge, so it
      // stays an error pointing at a human.
      if (outcome.status === 'unconfirmed') {
        return setState({
          kind: 'error',
          message: `${outcome.message} Write to ${CONTACT.email} and we will sort it out.`,
        })
      }
      setState({ kind: 'unpaid', why: 'failed', detail: outcome.message })
    } catch (e) {
      track(EV.paymentFailed, {
        outcome: 'not_started',
        ...(e instanceof CheckoutError ? e.detail : { stage: 'unknown', code: 'exception' }),
      })
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Could not start the payment.',
      })
    }
  }

  const busy = state.kind === 'submitting' || state.kind === 'paying'

  /**
   * Started means typing, or about to: focus landing on a text field, the
   * address box or the quantity. The colour swatches are buttons inside the
   * form, and counting a tap on one as starting the form made the step look
   * far busier than it was.
   */
  const onFirstTouch = (e: React.FocusEvent<HTMLFormElement>) => {
    if (started.current) return
    if (!isEntryField(e.target)) return
    started.current = true
    track(EV.reserveFormStarted)
  }

  return (
    <form onSubmit={onSubmit} onFocusCapture={onFirstTouch} noValidate className="max-w-[600px]">
      {/* On the home page, one thing to buy: the robot, ready to use. The
          field is still sent, because the order records it and an order
          without one is stored as the kit (see README). At /kit the buyer
          picks, and the picker's checked radio is what posts. */}
      {chooseEdition
        ? <div className="mb-6"><EditionPicker name="edition" location="form" disabled={busy} /></div>
        : <input type="hidden" name="edition" value={DEFAULT_EDITION} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Name" autoComplete="name" error={errors.name} disabled={busy} />
        <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} disabled={busy} />
        <Field name="phone" label="Phone" type="tel" autoComplete="tel"
               placeholder="98765 43210" hint="Indian mobile" error={errors.phone} disabled={busy} />

      </div>

      <div className="mt-5">
        <label htmlFor="address" className="t-label block mb-2">Shipping address</label>
        <textarea
          id="address" name="address" rows={3} className="field resize-y"
          autoComplete="street-address" disabled={busy}
          placeholder="Flat / house, street, area, landmark"
          aria-invalid={errors.address ? 'true' : undefined}
          aria-describedby={errors.address ? 'address-err' : undefined}
        />
        {errors.address && <Err id="address-err">{errors.address}</Err>}
      </div>

      <div className="grid gap-5 sm:grid-cols-3 mt-5">
        <Field name="city" label="City" autoComplete="address-level2" error={errors.city} disabled={busy} />
        <Field name="pincode" label="PIN code" inputMode="numeric" autoComplete="postal-code"
               placeholder="560078" error={errors.pincode} disabled={busy} />
        <div>
          {/* "Quantity", not the product's name.
              This label was briefly edition-aware — "Robots" or "Kits" — which
              reads as a flourish and costs clarity: the field is a count, and
              the thing being counted is already named all over the page. It
              also named the field after the product, which is what the
              checkout tests find it by. Neutral is both clearer and stable. */}
          <label htmlFor="qty" className="t-label block mb-2">Quantity</label>
          <select ref={qtyRef} id="qty" name="qty" defaultValue="1" className="field" disabled={busy}
                  onChange={(e) => setQty(Number(e.target.value) || 1)}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Colour. Optional on purpose: it starts on a real answer, so someone
          who scrolls past it still gets a robot rather than a validation
          error. The value posts through a hidden input because swatches are
          buttons, and a button's label is a colour, not a word. */}
      <fieldset className="border-0 p-0 m-0 mt-5">
        <legend className="t-label mb-2 p-0">
          Colour
        </legend>
        {/* The page shows five; this batch is printed in two. Saying so here
            is the difference between a limit and a disappointment. */}
        <p className="text-[13px] mt-0 mb-2.5" style={{ color: 'var(--muted)' }}>
          This batch is printed in black and white.
        </p>
        <input type="hidden" name="shell" value={shell} />
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Shell colour"
               className="inline-flex items-center gap-2.5 p-2.5"
               style={{ borderRadius: 999, border: '1px solid var(--line)' }}>
            {ORDERABLE_SHELLS.map((s) => (
              <button
                key={s.id} type="button" role="radio"
                aria-checked={s.id === shell} aria-label={s.name}
                disabled={busy}
                onClick={() => setShell(s.id)}
                className="block cursor-pointer rounded-full"
                style={{
                  // The ring sits outside the swatch so it never tints the
                  // colour someone is trying to judge.
                  outline: s.id === shell ? '2px solid var(--ink)' : '2px solid transparent',
                  outlineOffset: 2,
                }}
              >
                <Swatch way={s} size={26} />
              </button>
            ))}
          </div>
          <span className="t-mono text-[12.5px]" style={{ color: 'var(--muted)' }}>
            {ORDERABLE_SHELLS.find((s) => s.id === shell)?.name ?? ''}
          </span>
        </div>
      </fieldset>

      <CouponField
        plan={plan}
        qty={qty}
        variant={variant ?? null}
        disabled={busy}
        onApplied={(applied) => {
          setDiscountPaise(applied?.discountPaise ?? 0)
          setCouponCode(applied?.code ?? null)
        }}
      />

      {/* Honeypot. Hidden from people and from screen readers alike. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      {/* How to pay. Two cards rather than a select, because the difference
          between them is a sentence each, not a word. The deposit leads: it
          is what most people choose and what the page has promised all the
          way down. */}
      <fieldset className="border-0 p-0 m-0 mt-8">
        <legend className="t-label mb-2.5 p-0">How would you like to pay?</legend>
        <input type="hidden" name="plan" value={plan} />
        <div role="radiogroup" aria-label="How to pay" className="grid gap-2.5 sm:grid-cols-2">
          {([
            ['deposit', `Book for ${rupees(quote('deposit', qty, variant ?? null, discountPaise).nowPaise)}`,
             `${rupees(quote('deposit', qty, variant ?? null, discountPaise).balancePaise)} in cash when it is delivered`],
            ['full', `Pay ${rupees(quote('full', qty, variant ?? null, discountPaise).nowPaise)} now`,
             `Nothing at the door. ${EMI_TERMS.availability}`],
          ] as [Plan, string, string][]).map(([value, title, detail]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={plan === value}
              disabled={busy}
              onClick={() => setPlan(value)}
              className="text-left cursor-pointer w-full p-4"
              style={{
                borderRadius: 14,
                border: `1px solid ${plan === value ? 'var(--ink)' : 'var(--line)'}`,
                background: plan === value ? 'var(--surface)' : 'transparent',
              }}
            >
              <span className="block text-[15px] font-medium">{title}</span>
              <span className="block text-[13.5px] mt-1" style={{ color: 'var(--muted)' }}>{detail}</span>
            </button>
          ))}
        </div>
        {plan === 'full' && emiFromLine() && (
          <p className="text-[13px] mt-2.5 mb-0" style={{ color: 'var(--muted)' }}>
            {emiFromLine()}. {EMI_TERMS.noCost}
          </p>
        )}
      </fieldset>

      {/* Said before the button, not after: the buyer should know exactly
          what this payment is and what is still to come. */}
      <dl className="mt-8 m-0 border-t border-b text-[15px]" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="font-medium">Pay now to book</dt>
          <dd className="m-0 t-display text-[24px] leading-none">{paysNow}</dd>
        </div>
        {discountPaise > 0 && (
          <div className="flex items-baseline justify-between gap-4 py-3 border-t" style={{ borderColor: 'var(--line-soft)' }}>
            <dt className="text-[var(--muted)]">{couponCode}</dt>
            <dd className="m-0 t-mono" style={{ color: 'var(--accent-ink)' }}>−{rupees(discountPaise)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 py-3 border-t" style={{ borderColor: 'var(--line-soft)' }}>
          <dt className="text-[var(--muted)]">
            {plan === 'full' ? 'Due on delivery' : 'Remaining, charged after booking, on delivery'}
          </dt>
          <dd className="m-0 t-mono">{owed}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3 border-t" style={{ borderColor: 'var(--line-soft)' }}>
          <dt className="text-[var(--muted)]">Total</dt>
          <dd className="m-0 t-mono">{total}</dd>
        </div>
      </dl>

      <div className="mt-7 flex flex-wrap items-center gap-5">
        <button type="submit" className="btn btn-brand" disabled={busy}>
          {state.kind === 'submitting' ? 'Saving…'
            : state.kind === 'paying' ? 'Opening payment…'
            : plan === 'full' ? `Pay ${paysNow}` : `Book for ${paysNow}`}
        </button>
        <p className="t-label m-0">Card · UPI · netbanking · EMI</p>
      </div>

      <p className="text-[12.5px] text-[var(--muted)] mt-4 mb-0 max-w-[52ch]">
        {plan === 'full'
          ? `${paysNow} is charged now and nothing is collected on delivery.`
          : `Only ${paysNow} is charged now. The remaining ${owed} is charged after booking: the courier collects it in cash when the box reaches you.`} Your address and phone go to the courier, because that is
        how a parcel arrives, and to Mixpanel so we can follow up if an order does
        not complete. Payment is handled by Razorpay, and your card details never
        reach us.
      </p>

      {state.kind === 'error' && (
        <p role="alert" className="t-mono mt-5 mb-0 text-[13px] text-[var(--danger)]">
          {state.message}
        </p>
      )}
    </form>
  )
}

function Err({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="t-mono mt-1.5 mb-0 text-[11.5px] text-[var(--danger)]">{children}</p>
  )
}

function Field({
  name, label, error, type = 'text', autoComplete, placeholder, hint, inputMode, disabled,
}: {
  name: string; label: string; error?: string; type?: string
  autoComplete?: string; placeholder?: string; hint?: string
  inputMode?: 'numeric' | 'tel' | 'text'; disabled?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} className="t-label block mb-2">
        {label}{hint && <span className="opacity-60"> ({hint})</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="field"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${name}-err` : undefined}
      />
      {error && <Err id={`${name}-err`}>{error}</Err>}
    </div>
  )
}

/** A field someone fills in, as opposed to a button or a radio inside the form. */
const NOT_TYPED = new Set(['button', 'submit', 'reset', 'radio', 'checkbox', 'hidden', 'image', 'file', 'range', 'color'])
function isEntryField(el: EventTarget | null): boolean {
  if (!el || typeof (el as Element).tagName !== 'string') return false
  const tag = (el as Element).tagName.toLowerCase()
  if (tag === 'textarea' || tag === 'select') return true
  if (tag !== 'input') return false
  return !NOT_TYPED.has(((el as HTMLInputElement).type || 'text').toLowerCase())
}

/** A random id for one order, for matching the two reports of it at X. */
function newOrderId(): string {
  try { return crypto.randomUUID() } catch { /* insecure origin */ }
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('-')
}
