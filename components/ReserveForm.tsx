'use client'

import { useState } from 'react'
import { preorderSchema, fieldErrors } from '@/lib/schema'
import { EV, track } from '@/lib/analytics'

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'reserved' }
  | { kind: 'already' }
  | { kind: 'error'; message: string }

export default function ReserveForm() {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (state.kind === 'reserved' || state.kind === 'already') {
    return (
      <div className="card p-8" role="status">
        <span className="badge badge-brand"><span className="dot" />
          {state.kind === 'reserved' ? 'Reserved' : 'Already reserved'}
        </span>
        <p className="t-display text-[30px] mt-4 mb-3">
          {state.kind === 'reserved' ? "You're on the list." : "You're already on the list."}
        </p>
        <p className="max-w-[46ch] text-[var(--muted)] m-0">
          We'll email you when your kit ships. Reserving costs nothing and commits you to nothing —
          you pay when we confirm your batch.
        </p>
      </div>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      qty: String(form.get('qty') ?? '1'),
      city: String(form.get('city') ?? ''),
      company: String(form.get('company') ?? ''),
    }

    // Fast local feedback. The server re-runs this and its answer is the one
    // that counts.
    const local = preorderSchema.safeParse(payload)
    if (!local.success) {
      setErrors(fieldErrors(local.error))
      setState({ kind: 'idle' })
      return
    }

    setErrors({})
    setState({ kind: 'submitting' })
    // Quantity only. Never the name, email or city.
    track(EV.reserveSubmitted, { qty: local.data.qty })

    try {
      const res = await fetch('/api/preorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))

      if (res.status === 201) { track(EV.reserveSucceeded); return setState({ kind: 'reserved' }) }
      if (res.status === 409) { track(EV.reserveDuplicate); return setState({ kind: 'already' }) }
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

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-[560px]">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="name" label="Name" autoComplete="name" error={errors.name} />
        <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
        <Field name="city" label="City" autoComplete="address-level2" error={errors.city} optional />
        <div>
          <label htmlFor="qty" className="t-label block mb-2">Kits</label>
          <select id="qty" name="qty" defaultValue="1" className="field" disabled={busy}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Honeypot. Hidden from people and from screen readers alike. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button type="submit" className="btn btn-brand" disabled={busy}>
          {busy ? 'Reserving…' : 'Reserve a kit'}
        </button>
        <p className="t-label m-0">No payment now</p>
      </div>

      {state.kind === 'error' && (
        <p role="alert" className="t-mono mt-5 mb-0 text-[13px] text-[var(--danger)]">
          {state.message}
        </p>
      )}
    </form>
  )
}

function Field({
  name, label, error, type = 'text', autoComplete, optional,
}: {
  name: string; label: string; error?: string
  type?: string; autoComplete?: string; optional?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} className="t-label block mb-2">
        {label}{optional && <span className="opacity-60"> — optional</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="field"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${name}-err` : undefined}
      />
      {error && (
        <p id={`${name}-err`} className="t-mono mt-1.5 mb-0 text-[11.5px] text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  )
}
