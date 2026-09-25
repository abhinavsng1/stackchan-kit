import Link from 'next/link'
import Image from 'next/image'
import Gallery from '@/components/Gallery'
import DemoVideo from '@/components/DemoVideo'
import Clip from '@/components/Clip'
import StructuredData from '@/components/StructuredData'
import BuyBox from '@/components/BuyBox'
import Nav from '@/components/Nav'
import ReserveForm from '@/components/ReserveForm'
import BuyBar from '@/components/BuyBar'
import PartArt from '@/components/PartArt'
import Capabilities from '@/components/Capabilities'
import { SignalFlow } from '@/components/Diagrams'
import { TrackedLink, TrackedDetails } from '@/components/Tracked'
import { EV } from '@/lib/events'
import {
  PARTS, BUILD_STEPS, SPEC_TABLES, BUILDS, FAQS, PRICE, CONTACT,
} from '@/lib/kit'

const TONE: Record<string, string> = {
  brand: 'var(--brand)', mint: 'var(--mint)', amber: 'var(--amber)', violet: 'var(--violet)',
}

function SpecGrid({ table }: { table: (typeof SPEC_TABLES)[number] }) {
  return (
    <table className="spec-grid">
      <thead>
        <tr><th scope="col">Specification</th><th scope="col">Parameter</th></tr>
      </thead>
      <tbody>
        {table.rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            <td>
              {Array.isArray(r.value)
                ? r.value.map((line) => <div key={line}>{line}</div>)
                : r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Section({
  id, eyebrow, title, lede, children, tint, center,
}: {
  id?: string; eyebrow: string; title: string; lede?: string
  children: React.ReactNode; tint?: boolean; center?: boolean
}) {
  return (
    <section id={id} className="py-12 md:py-20 scroll-mt-20"
             style={tint ? { background: 'var(--surface)' } : undefined}>
      <div className={center ? 'wrap text-center' : 'wrap'}>
        <p className="t-label m-0 mb-3">{eyebrow}</p>
        <h2 className="t-display text-[clamp(26px,4vw,38px)] mt-0 mb-3">{title}</h2>
        {lede && <p className={`text-[var(--muted)] mt-0 mb-8 max-w-[58ch] ${center ? 'mx-auto' : ''}`}>{lede}</p>}
        {!lede && <div className="mb-8" />}
        {children}
      </div>
    </section>
  )
}

export default function Page() {
  return (
    <>
      <StructuredData />
      <div className="text-center text-[12.5px] sm:text-[13px] py-2.5 px-4 whitespace-nowrap overflow-hidden"
           style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
        <span className="t-pixel text-[10.5px] mr-2.5 opacity-70">Batch 01</span>
        <span className="hidden sm:inline">Now taking reservations · </span>
        {PRICE.ship} · {PRICE.save}
      </div>

      <Nav />

      <main id="top">
        {/* ================= PRODUCT ================= */}
        <section className="wrap pt-5 pb-12 md:pt-8 md:pb-16">
          <nav aria-label="Breadcrumb" className="t-mono text-[11.5px] text-[var(--muted)] mb-5">
            Pebble Robo <span className="opacity-50">›</span> Kits{' '}
            <span className="opacity-50">›</span> <span className="text-[var(--ink)]">Pebble-chan</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
            <Gallery />
            <BuyBox />
          </div>
        </section>

        {/* ================= PART NUMBER TICKER ================= */}
        <div className="marquee overflow-hidden border-y py-3.5"
             style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
                {PARTS.map((p) => (
                  <span key={p.desig} className="flex items-center gap-2.5 px-6 whitespace-nowrap">
                    <span className="t-pixel text-[10px] text-[var(--brand)]">{p.desig}</span>
                    <span className="t-mono text-[12.5px] text-[var(--muted)]">{p.name}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ================= DEMO ================= */}
        <section id="demo" className="py-12 md:py-16 scroll-mt-20">
          <div className="wrap">
            <div className="max-w-[900px] mx-auto">
              <p className="t-label m-0 mb-3">Demo</p>
              <h2 className="t-display text-[clamp(24px,3.4vw,34px)] mt-0 mb-6">
                This is it, assembled and running.
              </h2>
              <DemoVideo />
            </div>
          </div>
        </section>

        {/* ================= WHAT IT DOES ================= */}
        <Section id="does" eyebrow="What it does" title="Not an ornament. It runs."
                 lede="Every tile cites the part that provides it, so you can check the claim against the bill of materials.">
          <Capabilities />
        </Section>

        {/* ================= IN THE BOX ================= */}
        <Section id="box" eyebrow="In the box" title={`${PARTS.length} parts. Nothing else to buy.`}
                 lede="Including the printed shell and the fasteners. You supply a USB-C cable and a computer."
                 tint>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-8 lg:items-start">
          <figure className="m-0 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
            <Image src="/kit-flatlay.webp" alt="Everything in the kit laid out beside its box"
                   width={1672} height={941} sizes="(max-width: 1024px) 100vw, 620px"
                   className="w-full h-auto block" />
          </figure>

          <ul className="grid gap-2 sm:grid-cols-2 list-none p-0 m-0">
            {PARTS.map((p) => (
              <li key={p.desig} className="card p-2.5 flex items-center gap-3">
                <span className="w-[46px] h-[46px] shrink-0 rounded-lg grid place-items-center overflow-hidden"
                      style={{ background: 'var(--flatlay)' }}>
                  <span className="block w-[82%] [&>svg]:w-full [&>svg]:h-auto"><PartArt kind={p.art} /></span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="t-pixel text-[9.5px] text-[var(--brand)]">{p.desig}</span>
                    <span className="t-mono text-[10.5px] text-[var(--muted)]">{p.qty}</span>
                  </span>
                  <span className="block text-[13px] font-semibold leading-tight mt-0.5">{p.name}</span>
                </span>
              </li>
            ))}
          </ul>
          </div>
        </Section>

        {/* ================= WHAT YOU CAN BUILD ================= */}
        <Section id="build-ideas" eyebrow="What you can build"
                 title="It arrives as parts. What it becomes is up to you."
                 lede="Six things people have actually made with this hardware, with an honest sense of how long each one takes.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUILDS.map((b) => (
              <article key={b.title} className="card card-lift overflow-hidden flex flex-col">
                <Clip src={`/media/clips/${b.clip}`} poster={`/media/clips/${b.clip}.webp`}
                      alt={b.title} className="h-[168px]" />
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="t-display text-[19px] mt-0 mb-2.5">{b.title}</h3>
                  <p className="text-[14px] text-[var(--muted)] mt-0 mb-5 flex-1">{b.body}</p>
                  <span className="t-mono text-[11.5px] pt-3.5 border-t"
                        style={{ borderColor: 'var(--line)', color: TONE[b.tone] }}>
                    {b.effort}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* ================= SPECIFICATIONS ================= */}
        <Section id="specs" eyebrow="Specifications" title="Read the whole datasheet"
                 lede="Stock M5Stack and Feetech parts, named exactly. Look them up before you buy — we would." tint>
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
            {SPEC_TABLES.map((t) => (
              <div key={t.title} className="card overflow-hidden">
                {/* Folded on phones, where four full tables are most of the page.
                    Rendered twice rather than toggled after mount, so neither
                    layout flashes the wrong state. */}
                <details className="lg:hidden group">
                  <summary className="cursor-pointer list-none flex items-center gap-2.5 px-4 py-3">
                    <span className="t-pixel text-[10px] text-[var(--brand)]">{t.desig}</span>
                    <span className="text-[14px] font-semibold">{t.title}</span>
                    <span className="t-label ml-auto">{t.rows.length} rows</span>
                    <span aria-hidden="true" className="t-mono text-[var(--brand)] text-[16px] leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="overflow-x-auto border-t" style={{ borderColor: 'var(--line)' }}>
                    <SpecGrid table={t} />
                  </div>
                </details>

                <div className="hidden lg:block">
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'var(--line)' }}>
                    <span className="t-pixel text-[10px] text-[var(--brand)]">{t.desig}</span>
                    <span className="text-[14px] font-semibold">{t.title}</span>
                  </div>
                  <div className="overflow-x-auto"><SpecGrid table={t} /></div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ================= BUILD ================= */}
        <Section id="build" eyebrow="How you build it" title="Four steps, one evening"
                 lede="In order, because the order matters.">
          <ol className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 list-none p-0 m-0">
            {BUILD_STEPS.map((s) => (
              <li key={s.n} className="card p-4 sm:p-6 flex sm:block gap-4">
                <span className="t-pixel text-[22px] sm:text-[26px] text-[var(--brand)] leading-none shrink-0">
                  {String(s.n).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="t-display text-[17px] sm:text-[19px] mt-0 sm:mt-4 mb-1.5">{s.title}</h3>
                  <p className="text-[13.5px] text-[var(--muted)] m-0">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="card p-5 md:p-7 mt-5">
            <div className="t-label mb-4">How a command reaches a servo</div>
            <div className="overflow-x-auto"><div className="min-w-[560px]"><SignalFlow /></div></div>
          </div>
        </Section>

        {/* ================= DOCUMENTS ================= */}
        <Section eyebrow="Learn and documents" title="Everything is someone else's open source"
                 lede="We sell the parts, printed and matched. The software belongs to the Stack-chan project and always will.">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Stack-chan', 'The project this kit builds. Apache-2.0.', 'https://github.com/meganetaaan/stack-chan'],
              ['Moddable SDK', 'The JavaScript runtime the firmware uses.', 'https://www.moddable.com/'],
              ['CoreS3 Lite', 'The controller datasheet, from M5Stack.', 'https://docs.m5stack.com/en/core/CoreS3-Lite'],
            ].map(([title, body, href]) => (
              <TrackedLink key={href} href={href} target="_blank" rel="noreferrer noopener"
                           event={EV.outboundClicked} props={{ to: title }}
                           className="card card-lift p-5 no-underline text-[var(--ink)] block">
                <span className="t-display text-[17px] block">{title} ↗</span>
                <span className="text-[13.5px] text-[var(--muted)] block mt-1.5">{body}</span>
              </TrackedLink>
            ))}
          </div>
        </Section>

        {/* ================= FAQ ================= */}
        <Section id="faq" eyebrow="Questions" title="The things people ask first" tint center>
          <div className="card overflow-hidden max-w-[760px] mx-auto text-left">
            {FAQS.map((f, i) => (
              <TrackedDetails key={f.q} event={EV.faqOpened} props={{ question: f.q }}
                              className="group border-b last:border-b-0"
                              style={{ borderColor: 'var(--line)' }} open={i === 0}>
                <summary className="cursor-pointer list-none px-5 py-4 flex items-start gap-4 text-[15px] font-semibold">
                  <span className="flex-1">{f.q}</span>
                  <span aria-hidden="true" className="t-mono text-[var(--brand)] text-[18px] leading-none mt-0.5 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="px-5 pb-5 pt-0 mt-0 mb-0 text-[14.5px] text-[var(--muted)] max-w-[62ch]">{f.a}</p>
              </TrackedDetails>
            ))}
          </div>
        </Section>

        {/* ================= RESERVE ================= */}
        <section id="reserve" className="py-12 md:py-20 scroll-mt-20">
          <div className="wrap grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:gap-14">
            <div>
              <p className="t-label m-0 mb-3">Order</p>
              <h2 className="t-display text-[clamp(26px,4vw,38px)] mt-0 mb-3">Order from batch 01</h2>
              <p className="text-[var(--muted)] mt-0 mb-8 max-w-[46ch]">
                {PRICE.now} per kit, paid now. {PRICE.ship} to the address you give us.
              </p>
              <ReserveForm />
            </div>

            <aside className="card p-6 h-fit lg:sticky lg:top-24">
              <div className="flex items-baseline gap-3">
                <span className="t-display text-[34px] leading-none">{PRICE.now}</span>
                <span className="t-mono text-[14px] text-[var(--muted)] line-through">{PRICE.mrp}</span>
              </div>

              <p className="t-label mt-2 mb-0">{PRICE.ship}</p>

              <ol className="mt-6 mb-0 p-0 list-none grid gap-4">
                {[
                  ['You order', 'Your details and payment, on this page. Card, UPI, netbanking or EMI.'],
                  ['We box your kit', 'Parts matched, shell printed, servos addressed and centred.'],
                  ['We ship it', 'Dispatch within 1–2 weeks of the batch closing.'],
                  ['You build it', 'Four steps, one evening. Everything you need is in the box.'],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="t-pixel text-[11px] text-[var(--brand)] pt-[3px] shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold">{title}</span>
                      <span className="block text-[13px] text-[var(--muted)] mt-0.5">{body}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <p className="text-[12.5px] text-[var(--muted)] mt-6 mb-0 pt-4 border-t"
                 style={{ borderColor: 'var(--line)' }}>
                Questions before you buy? Write to{' '}
                <a href={`mailto:${CONTACT.email}`}
                   className="text-[var(--ink)] underline underline-offset-4">{CONTACT.email}</a>.
              </p>
            </aside>
          </div>
        </section>
      </main>

      <footer className="border-t pb-24 lg:pb-0" style={{ borderColor: 'var(--line)' }}>
        <div className="wrap py-12 grid gap-9 md:grid-cols-3">
          <div>
            <div className="t-display text-[19px] tracking-[-0.04em] mb-3">
              Pebble<span className="text-[var(--brand)]">·</span>chan
            </div>
            <p className="t-mono text-[13px] m-0">{CONTACT.entity}</p>
            <a href={`mailto:${CONTACT.email}`}
               className="t-mono text-[13px] mt-1 mb-0 inline-block text-[var(--ink)] underline underline-offset-4">
              {CONTACT.email}
            </a>
          </div>
          <div>
            <div className="t-label mb-3">Attribution</div>
            <p className="text-[13.5px] text-[var(--muted)] m-0 max-w-[36ch]">
              Based on{' '}
              <TrackedLink href="https://github.com/meganetaaan/stack-chan" target="_blank"
                           rel="noreferrer noopener" event={EV.outboundClicked}
                           props={{ to: 'stack-chan repo' }}
                           className="text-[var(--ink)] underline underline-offset-4">Stack-chan</TrackedLink>{' '}
              by Shinya Ishikawa and contributors, used under the Apache License 2.0.
              Pebble-chan is not an official Stack-chan or M5Stack product.
            </p>
          </div>
          <div>
            <div className="t-label mb-3">Policies</div>
            <ul className="list-none p-0 m-0 mb-7 grid gap-1.5">
              {[
                ['Returns and refunds', '/returns'],
                ['Shipping and delivery', '/shipping'],
                ['Terms of sale', '/terms'],
                ['Privacy', '/privacy'],
                ['Contact', '/contact'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-[13.5px] text-[var(--muted)] no-underline hover:underline underline-offset-4">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="t-label mb-3">Your data</div>
            <p className="text-[13.5px] text-[var(--muted)] m-0 mb-3 max-w-[36ch]">
              Ordering stores your name, email, phone, shipping address and
              profession. We use them to ship the kit and to tell you when it is
              on its way. Nothing else, and we do not pass them on. Card details
              go to Razorpay and never reach us.
            </p>
            <p className="text-[13.5px] text-[var(--muted)] m-0 max-w-[36ch]">
              We record how this page is used — clicks, scrolling and session
              replays — and share some of it with Meta so our ads reach the
              right people. What you type into the form is never recorded.
            </p>
          </div>
        </div>
      </footer>

      <BuyBar />
    </>
  )
}
