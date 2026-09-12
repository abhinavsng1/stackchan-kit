import Image from 'next/image'
import Robot3D from '@/components/Robot3D'
import Nav from '@/components/Nav'
import ReserveForm from '@/components/ReserveForm'
import MediaSlot from '@/components/MediaSlot'
import PartArt from '@/components/PartArt'
import Capabilities from '@/components/Capabilities'
import BuyBar from '@/components/BuyBar'
import { TrackedLink, TrackedDetails, PrivacyChoiceButton } from '@/components/Tracked'
import { EV } from '@/lib/events'
import { ServoSweep, SignalFlow } from '@/components/Diagrams'
import {
  PARTS, BUILD_STEPS, CORE_SPECS, SERVO_SPECS, FAQS, PRICE, CONTACT,
} from '@/lib/kit'

function SpecRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <table className="spec-table">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}><th scope="row">{r.label}</th><td>{r.value}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="t-label m-0 mb-3">{children}</p>
}

export default function Page() {
  return (
    <>
      {/* announcement */}
      <div className="text-center text-[12.5px] sm:text-[13px] py-2.5 px-4 whitespace-nowrap overflow-hidden"
           style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
        <span className="t-pixel text-[10.5px] mr-2.5 opacity-70">Batch 01</span>
        <span className="hidden sm:inline">Now taking reservations · </span>
        {PRICE.ship} · {PRICE.save}
      </div>

      <Nav />

      <main id="top">
        {/* ================= HERO ================= */}
        <section className="wrap pt-8 pb-12 md:pt-16 md:pb-24">
          <div className="grid gap-9 lg:gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center">

            <div className="rise order-2 lg:order-1">
              <span className="badge badge-brand"><span className="dot" />Open source · Apache-2.0</span>

              <h1 className="t-display text-[clamp(40px,6.6vw,66px)] mt-5 mb-0">
                The desktop robot<br />you build{' '}
                <span className="t-pixel text-[clamp(26px,4.4vw,45px)] text-[var(--brand)]">yourself</span>
              </h1>

              <p className="mt-5 mb-0 max-w-[46ch] text-[16px] sm:text-[17px] text-[var(--muted)]">
                Pebble-chan looks at you, talks back and nods along. Every part that
                makes it work is in one box, printed shell included.
              </p>

              <div className="mt-7 flex items-end gap-4 flex-wrap">
                <span className="t-display text-[clamp(40px,7vw,58px)] leading-none">{PRICE.now}</span>
                <span className="t-mono text-[17px] text-[var(--muted)] line-through mb-1">{PRICE.mrp}</span>
                <span className="badge mb-1.5" style={{ color: 'var(--mint)', borderColor: 'color-mix(in srgb, var(--mint) 40%, transparent)', background: 'color-mix(in srgb, var(--mint) 10%, var(--surface))' }}>
                  {PRICE.save}
                </span>
              </div>

              <div id="hero-cta" className="mt-7 flex flex-wrap items-center gap-3">
                <TrackedLink href="#reserve" event={EV.reserveCtaClicked} props={{ location: 'hero' }}
                             className="btn btn-brand grow sm:grow-0 justify-center">Reserve a kit →</TrackedLink>
                <a href="#does" className="btn btn-ghost grow sm:grow-0 justify-center">See what it does</a>
              </div>

              <ul className="mt-8 grid grid-cols-4 gap-x-3 gap-y-4 list-none p-0 m-0">
                {[
                  ['1–2 wks', 'Dispatch'],
                  ['₹0', 'Due today'],
                  ['11', 'Parts inside'],
                  ['100%', 'Open source'],
                ].map(([big, small]) => (
                  <li key={small}>
                    <div className="t-display text-[17px] sm:text-[21px]">{big}</div>
                    <div className="t-label mt-0.5">{small}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* robot + floating spec chips */}
            <div className="relative order-1 lg:order-2">
              <Robot3D />

              <div className="hidden sm:block absolute -left-2 top-[14%] float t-mono text-[12px] rotate-[-7deg]">
                <div className="t-label mb-0.5">Display</div>320 × 240 IPS
              </div>
              <div className="hidden sm:block absolute -right-1 top-[42%] float t-mono text-[12px] rotate-[6deg]">
                <div className="t-label mb-0.5">MCU</div>ESP32-S3
              </div>
              <div className="hidden sm:block absolute left-[1%] bottom-[26%] float t-mono text-[12px] rotate-[4deg]">
                <div className="t-label mb-0.5">Servos</div>2 × SCS0009
              </div>
            </div>
          </div>
        </section>

        {/* ================= BOM TICKER ================= */}
        <div className="marquee overflow-hidden border-y py-3.5" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
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

        {/* ================= VIDEO ================= */}
        <section className="wrap py-12 md:py-24">
          <div className="max-w-[620px]">
            <Eyebrow>Watch it run</Eyebrow>
            <h2 className="t-display text-[clamp(30px,5vw,46px)] mt-0 mb-4">
              Thirty seconds, no narration
            </h2>
            <p className="text-[var(--muted)] mt-0 mb-0 max-w-[50ch]">
              Assembled kit tracking a face, talking, and being picked up mid-sentence.
            </p>
          </div>
          <div className="mt-9">
            <MediaSlot label="Product demo video"
                       note="Drop the real clip in here — the layout is already sized for 16:9." />
          </div>
        </section>

        {/* ================= WHAT IT DOES ================= */}
        <section id="does" className="wrap py-12 md:py-24 scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-5 mb-10">
            <div>
              <Eyebrow>What it does</Eyebrow>
              <h2 className="t-display text-[clamp(30px,5vw,46px)] mt-0 mb-0">
                Not an ornament. It runs.
              </h2>
            </div>
            <p className="t-mono text-[12.5px] text-[var(--muted)] m-0 max-w-[30ch]">
              Every tile cites the part that provides it.
            </p>
          </div>

          <Capabilities />
        </section>

        {/* ================= IN THE BOX ================= */}
        <section id="box" className="py-12 md:py-24 scroll-mt-20" style={{ background: 'var(--flatlay)' }}>
          <div className="wrap">
            <div className="flex flex-wrap items-end justify-between gap-6 max-w-full">
              <div className="max-w-[620px]">
                <Eyebrow>In the box</Eyebrow>
                <h2 className="t-display text-[clamp(30px,5vw,46px)] mt-0 mb-4">
                  Eleven parts. Nothing else to buy.
                </h2>
                <p className="text-[var(--muted)] mt-0 mb-0 max-w-[50ch]">
                  Including the printed shell and the fasteners. You supply a USB-C
                  cable and a computer.
                </p>
              </div>
              <span className="badge"><span className="dot" />You assemble it — that is the point</span>
            </div>

            <figure className="m-0 mt-8 sm:mt-10 rounded-2xl overflow-hidden border"
                    style={{ borderColor: 'var(--line)' }}>
              <Image
                src="/kit-flatlay.webp"
                alt="Everything in the kit laid out beside its box: the controller, a bus servo, the driver board, the USB programmer, the power supply and cable, the printed shell and brackets, servo horns, jumper and JST cables, capacitors, and the fasteners."
                width={1672}
                height={941}
                sizes="(max-width: 1200px) 100vw, 1160px"
                priority={false}
                className="w-full h-auto block"
              />
            </figure>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 mt-6 sm:mt-8">
              {PARTS.map((p) => (
                <article key={p.desig} className="card card-lift p-3 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="w-full h-[74px] sm:w-[86px] sm:h-auto shrink-0 rounded-xl p-1.5 sm:p-2 grid place-items-center overflow-hidden"
                       style={{ background: 'var(--flatlay)' }}>
                    <div className="h-full sm:h-auto w-auto sm:w-full [&>svg]:h-full [&>svg]:w-auto sm:[&>svg]:w-full sm:[&>svg]:h-auto">
                      <PartArt kind={p.art} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="t-pixel text-[10px] text-[var(--brand)]">{p.desig}</span>
                      <span className="t-mono text-[11px] text-[var(--muted)]">{p.qty}</span>
                    </div>
                    <h3 className="text-[13.5px] sm:text-[15px] font-semibold mt-0 mb-0 sm:mb-1.5 leading-snug">{p.name}</h3>
                    <p className="hidden sm:block text-[13px] text-[var(--muted)] m-0">{p.note}</p>
                  </div>
                </article>
              ))}
            </div>

          </div>
        </section>

        {/* ================= SPECS ================= */}
        <section id="specs" className="wrap py-12 md:py-24 scroll-mt-20">
          <div className="max-w-[620px]">
            <Eyebrow>Specifications</Eyebrow>
            <h2 className="t-display text-[clamp(30px,5vw,46px)] mt-0 mb-4">
              Read the whole datasheet
            </h2>
            <p className="text-[var(--muted)] mt-0 mb-0 max-w-[50ch]">
              Stock M5Stack and Feetech parts, named exactly. Look them up before
              you buy — we would.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] mt-10">
            <div className="card overflow-hidden">
              {/* Phones get the datasheet folded away; it is 16 rows of detail
                  that would otherwise be most of a screen of scrolling. */}
              <TrackedDetails event={EV.specsExpanded} className="sm:hidden group">
                <summary className="cursor-pointer list-none flex items-center gap-2.5 px-4 py-3.5">
                  <span className="t-pixel text-[10px] text-[var(--brand)]">U1</span>
                  <span className="text-[14px] font-semibold">M5Stack CoreS3 Lite</span>
                  <span className="t-label ml-auto">{CORE_SPECS.length} specs</span>
                  <span aria-hidden="true" className="t-mono text-[var(--brand)] text-[16px] leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="overflow-x-auto border-t" style={{ borderColor: 'var(--line)' }}>
                  <SpecRows rows={CORE_SPECS} />
                </div>
              </TrackedDetails>

              <div className="hidden sm:block">
                <div className="flex items-center gap-2.5 px-4 py-3.5 border-b" style={{ borderColor: 'var(--line)' }}>
                  <span className="t-pixel text-[10px] text-[var(--brand)]">U1</span>
                  <span className="text-[14px] font-semibold">M5Stack CoreS3 Lite</span>
                </div>
                <div className="overflow-x-auto"><SpecRows rows={CORE_SPECS} /></div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3.5 border-b" style={{ borderColor: 'var(--line)' }}>
                  <span className="t-pixel text-[10px] text-[var(--mint)]">M1 · M2</span>
                  <span className="text-[14px] font-semibold">SCS0009 bus servo</span>
                </div>
                <SpecRows rows={SERVO_SPECS} />
              </div>
              <div className="card p-5 hidden sm:block">
                <div className="t-label mb-3">Travel</div>
                <div className="max-w-[260px] mx-auto"><ServoSweep /></div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= BUILD ================= */}
        <section id="build" className="py-12 md:py-24 scroll-mt-20" style={{ background: 'var(--surface)' }}>
          <div className="wrap">
            <div className="max-w-[620px]">
              <Eyebrow>How you build it</Eyebrow>
              <h2 className="t-display text-[clamp(30px,5vw,46px)] mt-0 mb-4">
                Four steps, one evening
              </h2>
              <p className="text-[var(--muted)] mt-0 mb-0 max-w-[50ch]">
                In order, because the order matters — set the servo addresses before
                anything is bolted shut.
              </p>
            </div>

            <ol className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-8 sm:mt-10 list-none p-0">
              {BUILD_STEPS.map((s) => (
                <li key={s.n} className="card p-4 sm:p-6 flex sm:block gap-4">
                  <span className="t-pixel text-[22px] sm:text-[26px] text-[var(--brand)] leading-none shrink-0">
                    {String(s.n).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="t-display text-[17px] sm:text-[19px] mt-0 sm:mt-4 mb-1.5 sm:mb-2">{s.title}</h3>
                    <p className="text-[13.5px] sm:text-[14px] text-[var(--muted)] m-0">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="card p-6 md:p-8 mt-6">
              <div className="t-label mb-5">How a command reaches a servo</div>
              <div className="overflow-x-auto"><div className="min-w-[560px]"><SignalFlow /></div></div>
            </div>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section id="faq" className="wrap py-12 md:py-24 scroll-mt-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <Eyebrow>Questions</Eyebrow>
              <h2 className="t-display text-[clamp(30px,5vw,42px)] mt-0 mb-4">
                The things people ask first
              </h2>
              <p className="text-[var(--muted)] mt-0 mb-0 max-w-[38ch]">
                Something not covered here? Write to us — a person answers.
              </p>
            </div>

            <div className="card overflow-hidden">
              {FAQS.map((f, i) => (
                <TrackedDetails key={f.q} event={EV.faqOpened} props={{ question: f.q }}
                                className="group border-b last:border-b-0" style={{ borderColor: 'var(--line)' }} open={i === 0}>
                  <summary className="cursor-pointer list-none px-5 py-4 flex items-start gap-4 text-[15px] font-semibold">
                    <span className="flex-1">{f.q}</span>
                    <span aria-hidden="true" className="t-mono text-[var(--brand)] text-[18px] leading-none mt-0.5 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="px-5 pb-5 pt-0 mt-0 mb-0 text-[14.5px] text-[var(--muted)] max-w-[62ch]">{f.a}</p>
                </TrackedDetails>
              ))}
            </div>
          </div>
        </section>

        {/* ================= RESERVE ================= */}
        <section id="reserve" className="py-12 md:py-24 scroll-mt-20" style={{ background: 'var(--surface)' }}>
          <div className="wrap grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16">
            <div>
              <Eyebrow>Reserve</Eyebrow>
              <h2 className="t-display text-[clamp(30px,5vw,46px)] mt-0 mb-4">
                Hold one from batch 01
              </h2>
              <p className="text-[var(--muted)] mt-0 mb-8 max-w-[46ch]">
                Nothing is charged now. We email you when your kit is boxed, and you
                pay then.
              </p>
              <ReserveForm />
            </div>

            <aside className="card p-7 h-fit">
              <div className="flex items-baseline gap-3">
                <span className="t-display text-[38px] leading-none">{PRICE.now}</span>
                <span className="t-mono text-[15px] text-[var(--muted)] line-through">{PRICE.mrp}</span>
              </div>
              <span className="badge mt-4" style={{ color: 'var(--mint)', borderColor: 'color-mix(in srgb, var(--mint) 40%, transparent)', background: 'color-mix(in srgb, var(--mint) 10%, var(--surface))' }}>
                {PRICE.save}
              </span>
              <dl className="mt-6 m-0 grid gap-0">
                {[
                  ['Dispatch', '1–2 weeks'],
                  ['Due today', '₹0'],
                  ['Parts inside', '11'],
                  ['Shell', 'Printed, included'],
                  ['Licence', 'Apache-2.0'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--line)' }}>
                    <dt className="t-label">{k}</dt>
                    <dd className="t-mono text-[13px] m-0 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t pb-24 lg:pb-0" style={{ borderColor: 'var(--line)' }}>
        <div className="wrap py-12 grid gap-9 md:grid-cols-3">
          <div>
            <div className="t-display text-[19px] tracking-[-0.04em] mb-3">
              Pebble<span className="text-[var(--brand)]">·</span>chan
            </div>
            <p className="t-mono text-[13px] m-0">{CONTACT.entity}</p>
            <p className="t-mono text-[13px] mt-1 mb-0">{CONTACT.email}</p>
          </div>
          <div>
            <div className="t-label mb-3">Attribution</div>
            <p className="text-[13.5px] text-[var(--muted)] m-0 max-w-[36ch]">
              Based on{' '}
              <TrackedLink href="https://github.com/meganetaaan/stack-chan" target="_blank" rel="noreferrer noopener"
                 event={EV.outboundClicked} props={{ to: 'stack-chan repo' }}
                 className="text-[var(--ink)] underline underline-offset-4">Stack-chan</TrackedLink>{' '}
              by Shinya Ishikawa and contributors, used under the Apache License 2.0.
              Pebble-chan is not an official Stack-chan or M5Stack product.
            </p>
          </div>
          <div>
            <div className="t-label mb-3">Your data</div>
            <p className="text-[13.5px] text-[var(--muted)] m-0 mb-3 max-w-[36ch]">
              Reserving stores your name, email, phone, shipping address and
              profession. We use them to ship the kit and to tell you when it is
              on its way. Nothing else, and we do not pass them on.
            </p>
            <p className="text-[13.5px] text-[var(--muted)] m-0 mb-3 max-w-[36ch]">
              If you agreed to it, we record how this page is used, including
              session replays. What you type into the form is never recorded.
            </p>
            <PrivacyChoiceButton />
          </div>
        </div>
      </footer>

      <BuyBar />
    </>
  )
}
