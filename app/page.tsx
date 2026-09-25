import Link from 'next/link'
import Image from 'next/image'
import DemoVideo from '@/components/DemoVideo'
import Clip from '@/components/Clip'
import StructuredData from '@/components/StructuredData'
import Cut from '@/components/Cut'
import Hero from '@/components/Hero'
import Playground from '@/components/Playground'
import BuyBox from '@/components/BuyBox'
import Nav from '@/components/Nav'
import ReserveForm from '@/components/ReserveForm'
import BuyBar from '@/components/BuyBar'
import PartArt from '@/components/PartArt'
import OpenSource from '@/components/OpenSource'
import { SignalFlow } from '@/components/Diagrams'
import { TrackedLink, TrackedDetails } from '@/components/Tracked'
import { EV } from '@/lib/events'
import {
  PARTS, BUILD_STEPS, SPEC_TABLES, BUILDS, FAQS, PRICE, CONTACT,
} from '@/lib/kit'

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

/**
 * A section: its heading pinned in a left column, its content beside it.
 *
 * Two earlier versions of this helper stacked the heading above the content
 * in a single narrow column. At 1440 that left the right two thirds of every
 * section header empty and put roughly 300px of nothing between one section
 * and the next — a phone layout stretched sideways, which is exactly how it
 * read. The heading now holds the left column and stays there while the
 * content scrolls past it, so the width is used and the eye always knows what
 * it is looking at.
 *
 * Below lg it collapses back to a stack, where a sticky heading would only
 * eat the screen.
 */
function Section({
  id, eyebrow, title, lede, children, tint, aside,
}: {
  id?: string; eyebrow: string; title: string; lede?: string
  children: React.ReactNode; tint?: boolean
  /** Extra facts under the lede — mono, because they are facts. */
  aside?: React.ReactNode
}) {
  return (
    <section id={id} className="py-14 md:py-20 scroll-mt-20"
             style={tint ? { background: 'var(--surface)' } : undefined}>
      <div className="wrap-wide grid gap-8 lg:gap-14 lg:grid-cols-[minmax(260px,380px)_minmax(0,1fr)]
                      items-start">
        <div className="lg:sticky lg:top-24">
          <p className="t-label m-0 mb-4">{eyebrow}</p>
          <h2 className="t-display mt-0 mb-4"
              style={{ fontSize: 'clamp(30px, 2.9vw, 42px)', lineHeight: 1.06 }}>
            {title}
          </h2>
          {lede && (
            <p className="text-[15.5px] leading-[25px] text-[var(--muted)] mt-0 mb-0 max-w-[42ch]">
              {lede}
            </p>
          )}
          {aside && <div className="mt-6">{aside}</div>}
        </div>

        <div className="min-w-0">{children}</div>
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

      <main id="top">
        <Hero />

        <Nav />

        {/* ================= PRODUCT =================
            One large photograph of a real unit, at the scale the guideline
            asks for, with the order panel beside it. */}
        <section className="wrap-wide pt-10 pb-14 md:pt-14 md:pb-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16 items-start">
            <figure className="m-0">
              <div className="relative overflow-hidden"
                   style={{ borderRadius: 'var(--radius-tile)', background: 'var(--surface-2)' }}>
                <Image src="/media/unit.webp" alt="An assembled Pebble-chan on a desk, its display showing a face"
                       width={1100} height={1100} priority
                       sizes="(max-width: 1024px) 94vw, 780px"
                       className="w-full h-auto block overflow-hidden"
                   style={{ borderRadius: 'var(--radius-tile)' }} />
              </div>
              <figcaption className="t-mono text-[11.5px] text-[var(--muted)] mt-4">
                An assembled unit. Photographed, not rendered. · SKU PBL-KIT-01
              </figcaption>
            </figure>
            <div className="lg:sticky lg:top-24"><BuyBox /></div>
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
                    <span className="t-mono text-[11px] text-[var(--muted)]">{p.desig}</span>
                    <span className="t-mono text-[12.5px] text-[var(--muted)]">{p.name}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ================= DEMO =================
            The dark counterweight the guideline calls for: one per page, and
            this is the right one, because the film is already dark. */}
        <section id="demo" className="px-3 md:px-4 pt-14 md:pt-20 pb-4 scroll-mt-20">
          <div className="overflow-hidden p-6 sm:p-10 lg:p-14"
               style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)' }}>
            <p className="t-label m-0 mb-4" style={{ color: 'rgba(243,241,237,.55)' }}>Demo</p>
            <h2 className="t-display mt-0 mb-10 max-w-[18ch]"
                style={{ fontSize: 'clamp(32px,5.2vw,64px)', lineHeight: 1.02, color: 'var(--pebble-white)' }}>
              Forty seconds on what it is.
            </h2>
            <DemoVideo />
          </div>
        </section>

        {/* The brand's one graphic gesture. Once per layout — see Cut.tsx. */}
        <Cut className="py-0" />

        {/* ================= PLAY =================
            This replaced a six-tile grid that claimed these capabilities in
            150px cards. A claim you can operate beats a claim you can read. */}
        <Section id="does" eyebrow="What it does"
                 title="Not an ornament. It runs."
                 lede="Seven claims, and you can execute every one of them here. The model is built from the print files that ship in the box, its screen is drawn at the panel's real resolution, and the camera and microphone demos use your own — nothing is recorded, nothing is uploaded."
                 tint>
          <Playground />
        </Section>

        {/* ================= SOFTWARE ================= */}
        <section className="px-3 md:px-4 py-14 md:py-20">
          <OpenSource />
        </section>

        {/* ================= IN THE BOX ================= */}
        <Section id="box" eyebrow="In the box" title={`${PARTS.length} parts. Nothing else to buy.`}
                 lede="Including the printed shell and the fasteners. You supply a USB-C cable and a computer."
                >
          <figure className="m-0">
            <Image src="/kit-flatlay.webp" alt="Everything in the kit laid out beside its box"
                   width={1672} height={941} sizes="(max-width: 1200px) 96vw, 1200px"
                   className="w-full h-auto block overflow-hidden"
                   style={{ borderRadius: 'var(--radius-tile)' }} />
            <figcaption className="t-mono text-[11.5px] text-[var(--muted)] mt-4">
              Every part of one kit, as packed · {PARTS.length} parts
            </figcaption>
          </figure>

          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 list-none p-0 m-0 mt-8">
            {PARTS.map((p) => (
              <li key={p.desig} className="card p-3 flex items-center gap-3">
                <span className="w-[46px] h-[46px] shrink-0 rounded-lg grid place-items-center overflow-hidden"
                      style={{ background: 'var(--flatlay)' }}>
                  <span className="block w-[82%] [&>svg]:w-full [&>svg]:h-auto"><PartArt kind={p.art} /></span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="t-mono text-[10.5px] text-[var(--muted)]">{p.desig}</span>
                    <span className="t-mono text-[10.5px] text-[var(--muted)]">{p.qty}</span>
                  </span>
                  <span className="block text-[13px] font-semibold leading-tight mt-0.5">{p.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* ================= WHAT YOU CAN BUILD =================
            Two up rather than three, so the footage is large enough to read.
            The effort line is mono because it is a fact, and uncoloured
            because the site has no accent. */}
        <Section id="build-ideas" eyebrow="What you can build"
                 title="It arrives as parts. What it becomes is up to you."
                 lede="Six things people have actually made with this hardware, with an honest sense of how long each one takes."
                 tint>
          {/* A swipe rail on a phone. Six of these stacked was two and a half
              screens of scrolling for one section — the reason the capability
              grid was a rail in the first place. */}
          <div className="rail rail-2">
            {BUILDS.map((b) => (
              <article key={b.title} className="m-0">
                <div className="overflow-hidden"
                     style={{ borderRadius: 'var(--radius-tile)', background: 'var(--surface-2)' }}>
                  <Clip src={`/media/clips/${b.clip}`} poster={`/media/clips/${b.clip}.webp`}
                        alt={b.title} className="h-[190px] md:h-[300px]" />
                </div>
                <div className="pt-5">
                  <div className="flex items-baseline justify-between gap-4 mb-2.5">
                    <h3 className="t-display text-[22px] sm:text-[26px] m-0">{b.title}</h3>
                    <span className="t-mono text-[11px] text-[var(--muted)] shrink-0">{b.effort}</span>
                  </div>
                  <p className="text-[15px] leading-[24px] text-[var(--muted)] m-0 max-w-[52ch]">{b.body}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* ================= BUILD ================= */}
        <Section id="build" eyebrow="How you build it" title="Four steps, one evening"
                 lede="In order, because the order matters.">
          <ol className="grid gap-5 sm:gap-7 sm:grid-cols-2 list-none p-0 m-0">
            {BUILD_STEPS.map((s) => (
              <li key={s.n} className="flex sm:block gap-4 pt-5 border-t"
                  style={{ borderColor: 'var(--ink)' }}>
                <span className="t-mono text-[13px] text-[var(--muted)] shrink-0">
                  {String(s.n).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="t-display text-[20px] sm:text-[24px] mt-0 sm:mt-4 mb-2">{s.title}</h3>
                  <p className="text-[14.5px] leading-[23px] text-[var(--muted)] m-0">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* The assembly footage, which used to be the hero. It never worked
              there — handheld, dim, shot portrait — but here it is evidence
              rather than advertising, and being an unretouched phone video of
              someone actually doing this is exactly the claim. */}
          <figure className="m-0 mt-10">
            {/* Shot on a phone held upright, so it is 9:16. Left to fill the
                content column it rendered twelve hundred pixels tall and ate
                the section. Cropped to a wide frame instead: the hands and the
                part being driven are centred, which is all of the information
                in it. */}
            <div className="relative overflow-hidden aspect-[16/9]"
                 style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)' }}>
            <video
              className="absolute inset-0 w-full h-full object-cover"
              poster="/media/build-poster.webp"
              muted loop playsInline preload="none" controls
            >
              <source src="/media/build.webm" type="video/webm" />
              <source src="/media/build.mp4" type="video/mp4" />
            </video>
            </div>
            <figcaption className="t-mono text-[11.5px] text-[var(--muted)] mt-3">
              One kit going together, unedited · 14 seconds
            </figcaption>
          </figure>

          <div className="card p-5 md:p-8 mt-10">
            <div className="t-label mb-5">How a command reaches a servo</div>
            <div className="overflow-x-auto"><div className="min-w-[560px]"><SignalFlow /></div></div>
          </div>
        </Section>

        {/* ================= SPECIFICATIONS ================= */}
        <Section id="specs" eyebrow="Specifications" title="Read the whole datasheet"
                 lede="Stock M5Stack and Feetech parts, named exactly. Look them up before you buy — we would."
                 tint>
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
            {SPEC_TABLES.map((t) => (
              <div key={t.title} className="card overflow-hidden">
                {/* Folded on phones, where four full tables are most of the page.
                    Rendered twice rather than toggled after mount, so neither
                    layout flashes the wrong state. */}
                <details className="lg:hidden group">
                  <summary className="cursor-pointer list-none flex items-center gap-2.5 px-4 py-3">
                    <span className="t-mono text-[11px] text-[var(--muted)]">{t.desig}</span>
                    <span className="text-[14px] font-semibold">{t.title}</span>
                    <span className="t-label ml-auto">{t.rows.length} rows</span>
                    <span aria-hidden="true" className="t-mono text-[16px] leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="overflow-x-auto border-t" style={{ borderColor: 'var(--line)' }}>
                    <SpecGrid table={t} />
                  </div>
                </details>

                <div className="hidden lg:block">
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'var(--line)' }}>
                    <span className="t-mono text-[11px] text-[var(--muted)]">{t.desig}</span>
                    <span className="text-[14px] font-semibold">{t.title}</span>
                  </div>
                  <div className="overflow-x-auto"><SpecGrid table={t} /></div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ================= DOCUMENTS ================= */}
        <Section eyebrow="Learn and documents" title="Everything is someone else's open source"
                 lede="We sell the parts, printed and matched. The software belongs to the Stack-chan project and always will."
                >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Stack-chan', 'The project this kit builds. Apache-2.0.', 'https://github.com/meganetaaan/stack-chan'],
              ['Moddable SDK', 'The JavaScript runtime the firmware uses.', 'https://www.moddable.com/'],
              ['CoreS3 Lite', 'The controller datasheet, from M5Stack.', 'https://docs.m5stack.com/en/core/CoreS3-Lite'],
            ].map(([title, body, href]) => (
              <TrackedLink key={href} href={href} target="_blank" rel="noreferrer noopener"
                           event={EV.outboundClicked} props={{ to: title }}
                           className="card card-lift p-6 no-underline text-[var(--ink)] block">
                <span className="t-display text-[19px] block">{title} ↗</span>
                <span className="text-[14px] text-[var(--muted)] block mt-2">{body}</span>
              </TrackedLink>
            ))}
          </div>
        </Section>

        {/* ================= FAQ ================= */}
        <Section id="faq" eyebrow="Questions" title="The things people ask first" tint>
          <div className="card overflow-hidden">
            {FAQS.map((f, i) => (
              <TrackedDetails key={f.q} event={EV.faqOpened} props={{ question: f.q }}
                              className="group border-b last:border-b-0"
                              style={{ borderColor: 'var(--line)' }} open={i === 0}>
                <summary className="cursor-pointer list-none px-5 py-4 flex items-start gap-4 text-[15px] font-semibold">
                  <span className="flex-1">{f.q}</span>
                  <span aria-hidden="true" className="t-mono text-[18px] leading-none mt-0.5 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="px-5 pb-5 pt-0 mt-0 mb-0 text-[14.5px] text-[var(--muted)] max-w-[62ch]">{f.a}</p>
              </TrackedDetails>
            ))}
          </div>
        </Section>

        {/* ================= RESERVE ================= */}
        <section id="reserve" className="py-14 md:py-20 scroll-mt-20">
          <div className="wrap grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:gap-14">
            <div>
              <p className="t-label m-0 mb-4">Order</p>
              <h2 className="t-display mt-0 mb-5"
                  style={{ fontSize: 'clamp(32px,5.2vw,64px)', lineHeight: 1.02 }}>
                Order from batch 01
              </h2>
              <p className="text-[17px] leading-[28px] text-[var(--muted)] mt-0 mb-10 max-w-[46ch]">
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
                    <span className="t-mono text-[12px] text-[var(--muted)] pt-[3px] shrink-0">
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
            <Image src="/brand/logo-horizontal.svg" alt="Pebble Robotics"
                   width={160} height={17} className="w-[150px] h-auto block mb-4" />
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
            <p className="text-[13.5px] text-[var(--muted)] m-0 mb-3 max-w-[36ch]">
              The camera and microphone demos on this page run entirely in your
              browser. Nothing from either is recorded, stored or sent anywhere,
              and both stop the moment you switch away.
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
