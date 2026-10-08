import Image from 'next/image'
import Gallery from '@/components/Gallery'
import BuyBox from '@/components/BuyBox'
import ReserveForm from '@/components/ReserveForm'
import PartArt from '@/components/PartArt'
import { OrderSteps } from '@/components/OrderSteps'
import { KitOnly, ForEdition } from '@/components/EditionGate'
import { TrackedDetails } from '@/components/Tracked'
import { Reveal } from '@/components/site/motion'
import { EV } from '@/lib/events'
import { PARTS, BUILD_STEPS, SPEC_TABLES, PRICE, CONTACT, BUILDERS } from '@/lib/kit'

/**
 * Buying it: the product and its price, what is in the box, the full spec
 * sheet for anyone who wants it, and the order form.
 *
 * No countdown and no "only N left". The price, the deposit, the balance and
 * the dispatch window are stated once each, plainly, and they are the same
 * numbers the checkout charges against.
 */
const INCLUDED_ROBOT: [string, string][] = [
  ['PebbleRobo', 'Assembled, set up and tested'],
  ['Power adapter', '5 V 3 A, plug it in and go'],
  ['Support', `Real people at ${CONTACT.email}`],
]

function SpecGrid({ table }: { table: (typeof SPEC_TABLES)[number] }) {
  return (
    <table className="spec-grid">
      <thead><tr><th scope="col">Specification</th><th scope="col">Detail</th></tr></thead>
      <tbody>
        {table.rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            <td>{Array.isArray(r.value) ? r.value.map((l) => <div key={l}>{l}</div>) : r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Buy() {
  return (
    <>
      <section id="buy" className="section scroll-mt-20">
        <div className="wrap">
          <Reveal>
            <p className="t-label m-0 mb-6">Buy</p>
            <h2 className="t-display t-h1 m-0 max-w-[14ch]">Bring one home.</h2>
          </Reveal>

          <div className="grid gap-10 lg:gap-16 lg:grid-cols-12 items-start mt-14 md:mt-20">
            <div className="min-w-0 lg:col-span-7"><Gallery /></div>
            <div className="min-w-0 lg:col-span-5 lg:sticky lg:top-28"><BuyBox /></div>
          </div>

          {/* What's included */}
          <div id="included" className="scroll-mt-28 mt-24 md:mt-32 grid lg:grid-cols-12 gap-x-10 gap-y-8">
            <Reveal className="lg:col-span-4">
              <h3 className="t-display t-h3 m-0">What’s included</h3>
              <p className="text-[15.5px] text-[var(--muted)] mt-3 mb-0 max-w-[32ch]">
                Everything it needs to wake up, in one box. Delivery anywhere in India is free.
              </p>
            </Reveal>
            <div className="lg:col-span-8">
              <ForEdition
                assembled={
                  <dl className="grid sm:grid-cols-3 m-0">
                    {INCLUDED_ROBOT.map(([k, v]) => (
                      <div key={k} className="py-5 sm:pr-6 border-t" style={{ borderColor: 'var(--line)' }}>
                        <dt className="text-[18px] font-medium tracking-[-0.015em]">{k}</dt>
                        <dd className="m-0 mt-1 text-[14px] text-[var(--muted)]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                }
                kit={
                  <ul className="grid sm:grid-cols-2 list-none p-0 m-0">
                    {PARTS.map((p) => (
                      <li key={p.desig} className="py-4 sm:pr-6 border-t flex items-center gap-4" style={{ borderColor: 'var(--line)' }}>
                        <span className="w-11 h-11 shrink-0 rounded-lg grid place-items-center overflow-hidden"
                              style={{ background: 'var(--surface-2)' }}>
                          <span className="block w-[80%] [&>svg]:w-full [&>svg]:h-auto"><PartArt kind={p.art} /></span>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-medium leading-tight">{p.name}</span>
                          <span className="t-mono block text-[11.5px] text-[var(--muted)] mt-1">{p.qty}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                }
              />

              <div className="grid sm:grid-cols-3 gap-x-6 mt-10">
                {[
                  ['Delivery', `Free, anywhere in India. ${PRICE.ship}.`, '/shipping'],
                  ['Returns', '7 days from delivery for a robot that doesn’t work.', '/returns'],
                  ['Support', 'Write to us and a person who built it answers.', '/contact'],
                ].map(([k, v, href]) => (
                  <a key={k} href={href} className="group block py-5 border-t no-underline text-[var(--ink)]"
                     style={{ borderColor: 'var(--line)' }}>
                    <span className="flex items-center justify-between text-[15px] font-medium">
                      {k}
                      <span aria-hidden="true" className="text-[var(--muted)] transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </span>
                    <span className="block text-[14px] text-[var(--muted)] mt-1">{v}</span>
                  </a>
                ))}
              </div>

              <TrackedDetails event={EV.specsExpanded} className="group mt-10 border-t border-b" style={{ borderColor: 'var(--line)' }}>
                <summary id="specs" className="scroll-mt-28 cursor-pointer list-none flex items-center justify-between py-5 text-[16px] font-medium">
                  Full specifications
                  <span className="faq-icon group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2 pb-8">
                  {SPEC_TABLES.map((t) => (
                    <div key={t.title}>
                      <p className="t-label m-0 mb-2">{t.title}</p>
                      <div className="overflow-x-auto"><SpecGrid table={t} /></div>
                    </div>
                  ))}
                </div>
              </TrackedDetails>
            </div>
          </div>
        </div>
      </section>

      {/* The kit, explained — only for someone who has chosen it. */}
      <KitOnly>
        <section id="kit" className="section scroll-mt-28" style={{ background: 'var(--surface)' }}>
          <div className="wrap grid lg:grid-cols-12 gap-x-10 gap-y-12">
            <div className="lg:col-span-4">
              <p className="t-label m-0 mb-6">Your kit</p>
              <h2 className="t-display t-h2 m-0">Build it in an evening.</h2>
              <p className="t-lead mt-6 mb-0">
                Same parts, same printed shell, same {PRICE.now}. Eight parts, no
                soldering — and afterwards you know every screw in it.
              </p>
            </div>
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['/media/robot/parts.webp', 'Printed shell parts on a desk beside a finished robot'],
                  ['/media/robot/print.webp', 'Shell parts on the bed of a 3D printer'],
                ].map(([src, alt]) => (
                  <div key={src} className="media" style={{ aspectRatio: '4 / 5' }}>
                    <Image src={src} alt={alt} fill sizes="(max-width: 1024px) 46vw, 420px" className="object-cover" />
                  </div>
                ))}
              </div>
              <ol className="grid sm:grid-cols-2 gap-x-8 list-none p-0 mt-12 mb-0">
                {BUILD_STEPS.map((s) => (
                  <li key={s.n} className="py-6 border-t" style={{ borderColor: 'var(--line)' }}>
                    <span className="t-mono text-[13px] text-[var(--accent-ink)]">{String(s.n).padStart(2, '0')}</span>
                    <h3 className="t-display text-[24px] mt-3 mb-2">{s.title}</h3>
                    <p className="text-[15px] leading-[1.6] text-[var(--muted)] m-0">{s.body}</p>
                  </li>
                ))}
              </ol>
              <p className="text-[14px] text-[var(--muted)] mt-6 mb-0">
                You supply a USB-C cable and a computer to flash it.
              </p>
            </div>
          </div>
        </section>
      </KitOnly>

      {/* The order. */}
      <section id="reserve" className="section scroll-mt-20" style={{ paddingTop: 'clamp(64px, 8vw, 120px)' }}>
        <div className="wrap grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="t-label m-0 mb-6">Order</p>
            <h2 className="t-display t-h2 m-0 mb-5">Book yours.</h2>
            <p className="t-lead mt-0 mb-12 max-w-[42ch]">
              {PRICE.deposit} books your PebbleRobo today. The remaining {PRICE.balance} is
              paid in cash when it’s delivered.
            </p>
            <ReserveForm />
          </div>

          <aside className="lg:col-span-5 card p-7 md:p-8 h-fit lg:sticky lg:top-28">
            <div className="flex items-baseline gap-3">
              <span className="t-display text-[40px] leading-none">{PRICE.deposit}</span>
              <span className="text-[15px] text-[var(--muted)]">today</span>
            </div>
            <p className="text-[14px] text-[var(--muted)] mt-2 mb-0">
              {PRICE.balance} in cash on delivery · {PRICE.now} in total
            </p>
            <p className="t-label mt-6 mb-0">What happens next</p>
            <OrderSteps />
            <p className="text-[13.5px] text-[var(--muted)] mt-7 mb-0 pt-5 border-t" style={{ borderColor: 'var(--line)' }}>
              Made by <span className="text-[var(--ink)] font-medium">{BUILDERS.map((b) => b.name).join(' and ')}</span>,
              in Bengaluru. Questions first? Write to{' '}
              <a href={`mailto:${CONTACT.email}`} className="link">{CONTACT.email}</a>.
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}
