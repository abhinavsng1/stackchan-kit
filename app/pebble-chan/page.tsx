import { cookies, headers } from 'next/headers'
import type { Metadata } from 'next'
import { VARIANT_COOKIE, assignVariant, isVariant, pricing, SUBSCRIPTION_TERMS } from '@/lib/variants'
import { recordVariantView, looksLikeBot } from '@/lib/variant-views'
import PebbleHero from './PebbleHero'
import ReserveForm from '@/components/ReserveForm'
import { CONTACT } from '@/lib/kit'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pebble-chan — a small robot that lives on your desk',
  description:
    'Built, tested and ready. A palm-sized robot with a face that reacts, a head that '
    + 'turns to look at you, and a voice. ₹499 to prebook, the rest on delivery.',
  alternates: { canonical: 'https://pebblerobo.com/pebble-chan' },
}

const STILLS = [
  { src: '/media/pebble/still-10.webp', alt: 'Pebble-chan looking straight ahead, eyes open' },
  { src: '/media/pebble/still-28.webp', alt: 'Pebble-chan tilted, winking' },
  { src: '/media/pebble/still-46.webp', alt: 'Pebble-chan turned to one side, humming' },
  { src: '/media/pebble/still-58.webp', alt: 'Pebble-chan smiling on a desk beside a plant' },
]

export default async function PebbleChan() {
  // Assigned by proxy.ts before this renders. The fallback covers a direct
  // render in a context the proxy did not touch, so the page can never be
  // priceless.
  const jar = await cookies()
  const raw = jar.get(VARIANT_COOKIE)?.value ?? ''
  const variant = isVariant(raw) ? raw : assignVariant()
  const p = pricing(variant)
  const subscribed = variant === 'subscription'

  const h = await headers()
  if (!looksLikeBot(h.get('user-agent'))) {
    // Never let a counter failure take the page down with it.
    await recordVariantView(variant).catch(() => {})
  }

  return (
    <main id="top">
      <PebbleHero variant={variant} />

      {/* ---------------- what it is ---------------- */}
      <section className="wrap-wide py-16 md:py-24 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16 items-start">
        <div className="lg:sticky lg:top-24">
          <p className="t-label m-0 mb-4">What it is</p>
          <h2 className="t-display mt-0 mb-5" style={{ fontSize: 'clamp(30px,3.2vw,44px)', lineHeight: 1.04 }}>
            It arrives awake.
          </h2>
          <p className="text-[16px] leading-[26px] text-[var(--muted)] m-0 max-w-[42ch]">
            Not a kit. Not a weekend. It is assembled, the servos are addressed and
            centred, the firmware is flashed, and it has already been switched on and
            watched to make sure it behaves. Take it out, plug it in, and it looks up
            at you.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {STILLS.map((s) => (
            <figure key={s.src} className="m-0 overflow-hidden"
                    style={{ borderRadius: 'var(--radius-tile)', background: 'var(--surface-2)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} loading="lazy" decoding="async"
                   className="w-full h-auto block" />
            </figure>
          ))}
        </div>
      </section>

      {/* ---------------- what it does ---------------- */}
      <section className="py-16 md:py-24" style={{ background: 'var(--surface)' }}>
        <div className="wrap-wide">
          <p className="t-label m-0 mb-4">What it does</p>
          <h2 className="t-display mt-0 mb-10" style={{ fontSize: 'clamp(30px,3.2vw,44px)', lineHeight: 1.04 }}>
            A face, a neck, and something to say.
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['It has a face', 'Twelve expressions on a 2-inch screen. It blinks, it looks pleased, it looks doubtful. None of it is a loop — it reacts.'],
              ['It turns to look', 'Two servos pan and tilt the head. It follows you across the desk rather than staring at the wall.'],
              [subscribed ? 'It talks, while subscribed' : 'It talks', subscribed
                ? 'Two microphones and a speaker, with the voice and the answers coming from our service. Included for as long as you subscribe.'
                : 'Two microphones and a speaker. Ask it something and it answers — included for the life of the device, with nothing more to pay.'],
            ].map(([h3, body]) => (
              <article key={h3} className="card p-6">
                <h3 className="t-display text-[20px] mt-0 mb-2.5">{h3}</h3>
                <p className="text-[14.5px] leading-[23px] text-[var(--muted)] m-0">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- price ---------------- */}
      <section id="prebook" className="wrap-wide py-16 md:py-24 scroll-mt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16 items-start">
          <div>
            <p className="t-label m-0 mb-4">The price</p>
            <h2 className="t-display mt-0 mb-5" style={{ fontSize: 'clamp(30px,3.2vw,44px)', lineHeight: 1.04 }}>
              {subscribed ? `${p.total} for the robot. ${p.monthly} a month to talk.` : `${p.total}, once.`}
            </h2>
            <p className="text-[16px] leading-[26px] text-[var(--muted)] m-0 mb-8 max-w-[46ch]">
              {subscribed
                ? `${p.deposit} prebooks it. ${p.balance} in cash when it reaches you. The `
                  + `${p.monthly} monthly starts after delivery and covers the voice and the AI.`
                : `${p.deposit} prebooks it. ${p.balance} in cash when it reaches you. `
                  + 'Nothing after that, ever — no subscription, no account, no monthly anything.'}
            </p>

            {subscribed ? (
              <div className="card p-6">
                <p className="t-label m-0 mb-4">What {p.monthly} a month includes</p>
                <ul className="list-none p-0 m-0 mb-5 grid gap-2">
                  {SUBSCRIPTION_TERMS.includes.map((i) => (
                    <li key={i} className="flex gap-3 text-[14.5px]">
                      <span className="t-mono text-[var(--muted)]">·</span>{i}
                    </li>
                  ))}
                </ul>
                <p className="text-[13.5px] leading-[21px] m-0 pt-4 border-t"
                   style={{ borderColor: 'var(--line)' }}>
                  <strong className="font-semibold">If you stop paying:</strong>{' '}
                  {SUBSCRIPTION_TERMS.keeps} {SUBSCRIPTION_TERMS.loses} The robot is
                  yours either way — we do not take it back and we do not brick it.
                </p>
              </div>
            ) : (
              <div className="card p-6">
                <p className="t-label m-0 mb-3">No subscription</p>
                <p className="text-[14.5px] leading-[23px] text-[var(--muted)] m-0">
                  The voice, the AI and every update are included for the life of the
                  device. There is no account to keep, nothing to renew, and no way for
                  us to switch it off later.
                </p>
              </div>
            )}
          </div>

          <aside className="p-6 lg:sticky lg:top-24"
                 style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)', color: 'var(--pebble-white)' }}>
            <p className="t-label m-0 mb-4" style={{ color: 'rgba(243,241,237,.55)' }}>Prebook</p>
            <div className="flex items-baseline gap-3">
              <span className="t-display text-[44px] leading-none">{p.deposit}</span>
              <span className="text-[14px]" style={{ color: 'rgba(243,241,237,.65)' }}>today</span>
            </div>

            <dl className="grid gap-0 mt-6 m-0">
              {([
                ['On delivery, cash', p.balance],
                ['Device total', p.total],
                ...(subscribed ? [['Then, monthly', `${p.monthly}/mo`]] : []),
                ['Ships in', '2–3 weeks'],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5"
                     style={{ borderBottom: '1px solid rgba(243,241,237,.14)' }}>
                  <dt className="t-label" style={{ color: 'rgba(243,241,237,.55)' }}>{k}</dt>
                  <dd className="t-mono text-[13px] m-0">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="t-mono text-[10.5px] mt-6 mb-0" style={{ color: 'rgba(243,241,237,.45)' }}>
              Card · UPI · netbanking · EMI. Built to order in Bengaluru.
            </p>
          </aside>
        </div>
      </section>

      <section className="py-16 md:py-24" style={{ background: 'var(--surface)' }}>
        <div className="wrap-wide grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] lg:gap-16">
          <div>
            <p className="t-label m-0 mb-4">Prebook</p>
            <h2 className="t-display mt-0 mb-5" style={{ fontSize: 'clamp(30px,3.2vw,44px)', lineHeight: 1.04 }}>
              {p.deposit} holds one.
            </h2>
            <p className="text-[16px] leading-[26px] text-[var(--muted)] mt-0 mb-8 max-w-[46ch]">
              {p.balance} in cash when it reaches you
              {subscribed ? `, then ${p.monthly} a month for the voice and the AI.` : '. Nothing after that.'}
            </p>
            {/* The same order flow the kit uses, carrying which price was shown. */}
            <ReserveForm variant={variant} />
          </div>
          <aside className="card p-6 h-fit lg:sticky lg:top-24">
            <p className="t-label m-0 mb-4">What happens next</p>
            <ol className="m-0 p-0 list-none grid gap-4">
              {([
                ['You prebook', `Your details and ${p.deposit}, on this page.`],
                ['We build yours', 'Assembled, flashed, servos centred and tested by hand.'],
                ['We ship it', 'Dispatch within 2–3 weeks.'],
                ['You pay the rest', `${p.balance} in cash to the courier.`],
                ...(subscribed
                  ? [['Then monthly', `${p.monthly} for voice and AI, starting after delivery.`]]
                  : []),
              ] as const).map(([t, b], i) => (
                <li key={t} className="flex gap-3">
                  <span className="t-mono text-[12px] text-[var(--muted)] pt-[3px] shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold">{t}</span>
                    <span className="block text-[13px] text-[var(--muted)] mt-0.5">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <footer className="border-t py-10" style={{ borderColor: 'var(--line)' }}>
        <div className="wrap-wide flex flex-wrap gap-x-8 gap-y-2 items-baseline">
          <a href="/" className="text-[13.5px] text-[var(--ink)] underline underline-offset-4">
            Prefer to build it yourself? The kit →
          </a>
          <a href={`mailto:${CONTACT.email}`}
             className="t-mono text-[13px] text-[var(--muted)] no-underline hover:underline">
            {CONTACT.email}
          </a>
        </div>
      </footer>
    </main>
  )
}
