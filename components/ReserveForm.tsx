'use client'

import { useEffect, useRef, useState } from 'react'
import { preorderSchema, fieldErrors, PROFESSIONS } from '@/lib/schema'
import { EV, track } from '@/lib/analytics'
import { CONTACT } from '@/lib/kit'

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'reserved' }
  | { kind: 'already'; field: 'email' | 'phone' }
  | { kind: 'error'; message: string }

const EMPTY: Record<string, string> = {}

export default function ReserveForm() {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [errors, setErrors] = useState<Record<string, string>>(EMPTY)
  const qtyRef = useRef<HTMLSelectElement>(null)
  const started = useRef(false)

  // The buy box carries its quantity here, so nobody has to pick it twice.
  useEffect(() => {
    const onQty = (e: Event) => {
      const n = (e as CustomEvent<number>).detail
      if (qtyRef.current && n >= 1 && n <= 5) qtyRef.current.value = String(n)
    }
    window.addEventListener('sc:qty', onQty)
    return () => window.removeEventListener('sc:qty', onQty)
  }, [])

  if (state.kind === 'reserved' || state.kind === 'already') {
    const byPhone = state.kind === 'already' && state.field === 'phone'
    return (
      <div className="card p-8" role="status">
        <span className="badge badge-brand"><span className="dot" />
          {state.kind === 'reserved' ? 'Reserved' : 'Already reserved'}
        </span>

        <p className="t-display text-[30px] mt-4 mb-3">
          {state.kind === 'reserved'
            ? "You're on the list."
            : byPhone
              ? 'That number is already reserved.'
              : "You're already on the list."}
        </p>

        <p className="max-w-[48ch] text-[var(--muted)] m-0">
          {state.kind === 'reserved' ? (
            <>Check your inbox — a confirmation is on its way. Reserving costs nothing and
            commits you to nothing; you pay when we confirm your batch.</>
          ) : byPhone ? (
            <>We hold one reservation per person, and that phone number already has one —
            under a different email address. To change the email or the address on it, write
            to <a href={`mailto:${CONTACT.email}`}
                  className="text-[var(--ink)] underline underline-offset-4">{CONTACT.email}</a>{' '}
            and we&apos;ll update it.</>
          ) : (
            <>That email is already reserved, so there is nothing more to do. We&apos;ll write to
            you when your kit ships.</>
          )}
        </p>
      </div>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      company: get('company'),
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
    track(EV.reserveSubmitted, { qty: local.data.qty, profession: local.data.profession })

    try {
      const res = await fetch('/api/preorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))

      if (res.status === 201) { track(EV.reserveSucceeded); return setState({ kind: 'reserved' }) }
      if (res.status === 409) {
        const field = body.field === 'phone' ? 'phone' : 'email'
        track(EV.reserveDuplicate, { field })
        return setState({ kind: 'already', field })
      }
      if (res.status === 400 && body.fields) {
        setErrors(body.fields)
        return setState({ kind: 'idle' })
      }
      track(EV.reserveFailed, { status: res.status })
      setState({ kind: 'error', message: body.error ?? 'That did not go through. Try again.' })
    } catch {
      track(EV.reserveFailed, { status: 'network' })
      setState({ kind: 'error', message: 'No connection. Check your network and try again.' })
    }
  }

  const busy = state.kind === 'submitting'

  const onFirstTouch = () => {
    if (started.current) return
    started.current = true
    track(EV.reserveFormStarted)
  }

  return (
    <form onSubmit={onSubmit} onFocusCapture={onFirstTouch} noValidate className="max-w-[600px]">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Name" autoComplete="name" error={errors.name} disabled={busy} />
        <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} disabled={busy} />
        <Field name="phone" label="Phone" type="tel" autoComplete="tel"
               placeholder="98765 43210" hint="Indian mobile" error={errors.phone} disabled={busy} />

        <div>
          <label htmlFor="profession" className="t-label block mb-2">
            Profession<span className="opacity-60"> — optional</span>
          </label>
          <select id="profession" name="profession" defaultValue="" className="field" disabled={busy}
                  aria-invalid={errors.profession ? 'true' : undefined}
                  aria-describedby={errors.profession ? 'profession-err' : undefined}>
            <option value="">Prefer not to say</option>
            {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {errors.profession && <Err id="profession-err">{errors.profession}</Err>}
        </div>
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
          <label htmlFor="qty" className="t-label block mb-2">Kits</label>
          <select ref={qtyRef} id="qty" name="qty" defaultValue="1" className="field" disabled={busy}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Honeypot. Hidden from people and from screen readers alike. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-5">
        <button type="submit" className="btn btn-brand" disabled={busy}>
          {busy ? 'Reserving…' : 'Place my reservation'}
        </button>
        <p className="t-label m-0">No payment now</p>
      </div>

      <p className="text-[12.5px] text-[var(--muted)] mt-4 mb-0 max-w-[52ch]">
        Your address and phone are used to ship the kit and to tell you when it is on
        its way. Nothing else, and we do not pass them on.
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
        {label}{hint && <span className="opacity-60"> — {hint}</span>}
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
