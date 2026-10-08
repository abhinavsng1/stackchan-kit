import Link from 'next/link'
import Image from 'next/image'
import Clip from '@/components/Clip'
import StructuredData from '@/components/StructuredData'
import Cut from '@/components/Cut'
import Hero from '@/components/Hero'
import Films from '@/components/Films'
import Gallery from '@/components/Gallery'
import BuyBox from '@/components/BuyBox'
import Nav from '@/components/Nav'
import ReserveForm from '@/components/ReserveForm'
import BuyBar from '@/components/BuyBar'
import PartArt from '@/components/PartArt'
import OpenSource from '@/components/OpenSource'
import Roles from '@/components/Roles'
import LiveRobot from '@/components/LiveRobot'
import Marquee from '@/components/Marquee'
import { OrderSteps, ChooseEdition } from '@/components/OrderSteps'
import { KitOnly, ForEdition, SwitchEdition } from '@/components/EditionGate'
import { SignalFlow } from '@/components/Diagrams'
import { TrackedLink, TrackedDetails } from '@/components/Tracked'
import { EV } from '@/lib/events'
import {
  PARTS, BUILD_STEPS, SPEC_TABLES, BUILDS, FAQS, PRICE, CONTACT, CAPABILITIES, BUILDERS,
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

/** What the ticker says: what you get, not what it is made of. */
const FEATURES = {
  assembled: ['Fully assembled', 'Tested before it ships'],
  kit: ['Build-it-yourself kit', 'Eight parts, no soldering'],
} as const
const COMMON_FEATURES = [
  'ESP32-S3', '2.0″ capacitive touch display',
  'Pan and tilt on two bus servos', 'Camera', 'Dual microphones', '1 W speaker',
  'Wi-Fi and Bluetooth', 'Stack-chan firmware, Apache-2.0',
]

function Ticker({ items }: { items: string[] }) {
  return (
    <div className="marquee-track">
      {[0, 1].map((dup) => (
        <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
          {items.map((f) => (
            <span key={f} className="flex items-center gap-6 px-3 whitespace-nowrap">
              <span className="t-mono text-[12.5px] text-[var(--muted)]">{f}</span>
              <span className="dot opacity-40" aria-hidden="true" />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

/** The hardware, one line per subsystem. The full tables are in #specs. */
const HARDWARE: [string, string][] = [
  ['Face', '2.0″ IPS, 320 × 240, capacitive touch'],
  ['Brain', 'ESP32-S3, dual-core 240 MHz, 16 MB flash, 8 MB PSRAM'],
  ['Neck', 'Two SCS0009 bus servos — pan and tilt, with position readback'],
  ['Voice', '1 W speaker and two microphones on a full-duplex codec'],
  ['Senses', '0.3 MP camera, proximity and light, 6-axis IMU'],
  ['Links', 'Wi-Fi, Bluetooth LE, USB-C'],
  ['Power', '5 V 3 A adapter, in the box'],
]

export default function Page() {
  const filmed = CAPABILITIES.filter((c) => c.clip)
  const more = CAPABILITIES.filter((c) => !c.clip && c.key !== 'hack')

  return (
    <>
      <StructuredData />
      <Marquee />

      <Nav />

      <main id="top">
        <Hero />

        {/* ================= PRODUCT =================
            Stills of a real unit beside the order panel. The edition is
            chosen here, and the choice follows the visitor down the page. */}
        <section id="buy" className="wrap-wide pt-4 pb-14 md:pt-6 md:pb-20 scroll-mt-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 items-start">
            <Gallery />
            <div className="lg:sticky lg:top-24"><BuyBox /></div>
          </div>
        </section>

        {/* ================= FEATURE TICKER ================= */}
        <div className="marquee overflow-hidden border-y py-3.5"
             style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <ForEdition
            assembled={<Ticker items={[...FEATURES.assembled, ...COMMON_FEATURES]} />}
            kit={<Ticker items={[...FEATURES.kit, ...COMMON_FEATURES]} />} />
        </div>

        {/* ================= WATCH =================
            The page's dark counterweight. Three films rather than one, the
            way the reference does it: someone living with it, how it is made,
            and the motion on its own. */}
        <section id="watch" className="px-3 md:px-4 pt-14 md:pt-20 pb-4 scroll-mt-20">
          <div className="overflow-hidden p-6 sm:p-10 lg:p-14"
               style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)' }}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end mb-10 lg:mb-14">
              <div>
                <p className="t-label m-0 mb-4" style={{ color: 'rgba(243,241,237,.55)' }}>Watch</p>
                <h2 className="t-display m-0 max-w-[16ch]"
                    style={{ fontSize: 'clamp(32px,5.2vw,64px)', lineHeight: 1.02, color: 'var(--pebble-white)' }}>
                  Three ways to meet Pebble-chan.
                </h2>
              </div>
              <p className="m-0 text-[16px] leading-[26px] max-w-[44ch] lg:justify-self-end"
                 style={{ color: 'rgba(243,241,237,.62)' }}>
                Shot on a phone, on real desks, with real units. Each film has
                sound — press play when you are somewhere you can hear it.
              </p>
            </div>
            <div className="max-w-[1120px] mx-auto"><Films /></div>
          </div>
        </section>

        {/* What people make it. Sits straight after the films, because the
            films show it moving and this answers "and then what". */}
        <Roles />

        {/* The model, live. Placed after the roles rather than in the hero:
            the hero's job is to load fast with real footage, and a WebGL
            canvas competing for that first paint would cost the page its
            largest-contentful-paint for a worse picture. */}
        <section className="wrap-wide" style={{ paddingBottom: 'var(--section-y)' }}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] items-center">
            <LiveRobot />
            <div className="max-w-[40ch]">
              <p className="t-label m-0 mb-4">Have a go</p>
              <h2 className="t-display m-0 mb-5" style={{ fontSize: 'var(--t-h2)' }}>
                It is looking at you.
              </h2>
              <p className="m-0 mb-4 text-[var(--muted)]"
                 style={{ fontSize: 'var(--t-lead)', lineHeight: 'var(--lh-body)' }}>
                Move your cursor and the head follows, clamped to the angles the
                real servos reach and eased so it arrives rather than snaps. Tap
                it to change its mind.
              </p>
              <p className="t-mono m-0 text-[12.5px]" style={{ color: 'var(--muted-2)' }}>
                Built from the same print files as the robot in the box.
              </p>
            </div>
          </div>
        </section>

        {/* The brand's one graphic gesture. Once per layout — see Cut.tsx. */}
        <Cut className="py-0" />

        {/* ================= WHAT IT DOES ================= */}
        <Section id="does" eyebrow="What it does"
                 title="Not an ornament. It runs."
                 lede="It looks around, nods and pulls faces from the moment it is powered — filmed here on a batch 01 unit. Under the face is the hardware for everything you might teach it next."
                 tint>
          <div className="rail rail-3">
            {filmed.map((c) => (
              <article key={c.key} className="m-0">
                <div className="overflow-hidden aspect-[4/5]"
                     style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)' }}>
                  <Clip src={`/media/robot/${c.clip}`} poster={`/media/robot/${c.clip}.webp`}
                        alt={c.title} className="h-full" />
                </div>
                <div className="pt-5">
                  <h3 className="t-display text-[22px] m-0 mb-2">{c.title}</h3>
                  <p className="text-[14.5px] leading-[23px] text-[var(--muted)] m-0">{c.body}</p>
                  <p className="t-mono text-[11px] text-[var(--muted)] mt-3 mb-0">{c.source}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="t-label mt-12 mb-4">And the hardware for what comes next</p>
          <div className="rail rail-2">
            {more.map((c) => (
              <div key={c.key} className="card p-5">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h3 className="text-[16px] font-semibold m-0">{c.title}</h3>
                  <span className="t-mono text-[10.5px] text-[var(--muted)] text-right">{c.source}</span>
                </div>
                <p className="text-[14px] leading-[22px] text-[var(--muted)] m-0">{c.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ================= WHAT PEOPLE BUILD ================= */}
        <Section id="builds" eyebrow="What people build"
                 title="It sits on your desk. Then it gets a job."
                 lede="Six things this hardware is good at, with an honest sense of how long each one takes. None of them is needed to enjoy it.">
          <div className="rail">
            {BUILDS.map((b, i) => (
              <article key={b.title} className="card p-6 m-0 flex flex-col">
                <div className="flex items-baseline justify-between gap-4 mb-6">
                  <span className="t-mono text-[12px] text-[var(--muted)]">{String(i + 1).padStart(2, '0')}</span>
                  <span className="t-mono text-[11px] text-[var(--muted)]">{b.effort}</span>
                </div>
                <h3 className="t-display text-[21px] sm:text-[23px] m-0 mb-3">{b.title}</h3>
                <p className="text-[14.5px] leading-[23px] text-[var(--muted)] m-0">{b.body}</p>
              </article>
            ))}
          </div>
        </Section>

        {/* ================= HARDWARE ================= */}
        <Section id="hardware" eyebrow="Hardware"
                 title="Small head. Serious hardware."
                 lede="A stock M5Stack CoreS3 Lite on two Feetech bus servos, named exactly, so you can look up every part before you buy — we would."
                 tint>
          <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start">
            <figure className="m-0">
              <div className="relative overflow-hidden aspect-[4/3] md:aspect-[4/5]"
                   style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)' }}>
                <Image src="/media/robot/robot-ports.webp" alt="An assembled Pebble-chan up close, its side ports and two-servo neck in view"
                       fill quality={90} sizes="(max-width: 768px) 94vw, 420px" className="object-cover" />
              </div>
              <figcaption className="t-mono text-[11px] text-[var(--muted)] mt-3">
                The CoreS3 head on its two-servo neck
              </figcaption>
            </figure>

            <div>
              <dl className="m-0 grid border-t" style={{ borderColor: 'var(--ink)' }}>
                {HARDWARE.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] sm:grid-cols-[140px_minmax(0,1fr)] gap-4 py-4 border-b"
                       style={{ borderColor: 'var(--line)' }}>
                    <dt className="t-display text-[19px] sm:text-[21px]">{k}</dt>
                    <dd className="t-mono text-[13px] leading-[22px] m-0 pt-1">{v}</dd>
                  </div>
                ))}
              </dl>
              <a href="#specs" className="inline-block mt-6 text-[14px] text-[var(--ink)] underline underline-offset-4">
                The full spec sheet ↓
              </a>
            </div>
          </div>
        </Section>

        {/* ================= SOFTWARE ================= */}
        <section className="px-3 md:px-4 py-14 md:py-20">
          <OpenSource />
        </section>

        {/* ================= THE KIT =================
            The second way to buy it, and only shown to someone who has chosen
            it. Same price, so the only thing this section has to explain is
            what building it involves. */}
        <KitOnly>
        <Section id="kit" eyebrow="Your kit"
                 title="The same robot, as a kit."
                 lede={`Same parts, same printed shell, same ${PRICE.now}. It arrives as eight parts and goes together in an evening, with no soldering — and afterwards you know every screw in it.`}
                 aside={
                   <div className="flex flex-col items-start gap-4">
                     <ChooseEdition edition="kit" location="kit-section" className="btn btn-brand">
                       Book the kit — {PRICE.deposit}
                     </ChooseEdition>
                     <SwitchEdition to="assembled" location="kit-section"
                                    className="text-[14px] text-[var(--ink)] underline underline-offset-4 bg-transparent border-0 p-0 cursor-pointer">
                       Switch to fully assembled
                     </SwitchEdition>
                   </div>
                 }>
          <div className="grid gap-4 grid-cols-2">
            {[
              ['/media/robot/parts.webp', 'Printed shell parts on a desk beside a finished robot', 'The printed parts, before assembly'],
              ['/media/robot/print.webp', 'Shell parts on the bed of a 3D printer', 'Printed here — you never need a printer'],
            ].map(([src, alt, caption]) => (
              <figure key={src} className="m-0">
                <div className="relative overflow-hidden aspect-[4/5]"
                     style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)' }}>
                  <Image src={src} alt={alt} fill sizes="(max-width: 1024px) 46vw, 420px" className="object-cover" />
                </div>
                <figcaption className="t-mono text-[11px] text-[var(--muted)] mt-3">{caption}</figcaption>
              </figure>
            ))}
          </div>

          <p className="t-label mt-12 mb-4">In the box · {PARTS.length} parts</p>
          <ul className="grid gap-2.5 grid-cols-2 xl:grid-cols-3 list-none p-0 m-0">
            {PARTS.map((p) => (
              <li key={p.desig} className="card p-3 flex items-center gap-3">
                <span className="w-[46px] h-[46px] shrink-0 rounded-lg hidden sm:grid place-items-center overflow-hidden"
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
          <p className="text-[13.5px] text-[var(--muted)] mt-4 mb-0">
            You supply a USB-C cable and a computer to flash it.
          </p>

          <p className="t-label mt-12 mb-4">Four steps, one evening</p>
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

          {/* The assembly footage. Shot on a phone held upright, so it is
              cropped to a wide frame: the hands and the part being driven are
              centred, which is all of the information in it. */}
          <figure className="m-0 mt-10">
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

          {/* Hidden on phones, where it only ever showed as a sideways-scrolling
              strip; the four steps above already say the same thing in words. */}
          <div className="card p-5 md:p-8 mt-10 hidden sm:block">
            <div className="t-label mb-5">How a command reaches a servo</div>
            <div className="overflow-x-auto"><div className="min-w-[560px]"><SignalFlow /></div></div>
          </div>
        </Section>
        </KitOnly>

        {/* ================= SPECIFICATIONS ================= */}
        <Section id="specs" eyebrow="Specifications" title="Read the whole datasheet"
                 lede="Stock M5Stack and Feetech parts, named exactly. The robot and the kit are built from the same ones."
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
                 lede="We build the robot and print the parts. The software belongs to the Stack-chan project and always will.">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Stack-chan', 'The project Pebble-chan runs. Apache-2.0.', 'https://github.com/meganetaaan/stack-chan'],
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
        <Section id="faq" eyebrow="Questions" title="Good to know" tint>
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

        {/* ================= ORDER ================= */}
        <section id="reserve" className="py-14 md:py-20 scroll-mt-20">
          <div className="wrap grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:gap-14">
            <div>
              <p className="t-label m-0 mb-4">Order</p>
              <h2 className="t-display mt-0 mb-5"
                  style={{ fontSize: 'clamp(32px,5.2vw,64px)', lineHeight: 1.02 }}>
                Order from batch 01
              </h2>
              <p className="text-[17px] leading-[28px] text-[var(--muted)] mt-0 mb-10 max-w-[46ch]">
                {PRICE.deposit} books your Pebble-chan now. The remaining {PRICE.balance} is
                paid in cash when it is delivered.
              </p>
              <ReserveForm />
            </div>

            <aside className="card p-6 h-fit lg:sticky lg:top-24">
              <div className="flex items-baseline gap-3">
                <span className="t-display text-[34px] leading-none">{PRICE.deposit}</span>
                <span className="text-[14px] text-[var(--muted)]">to book</span>
              </div>

              <p className="text-[13px] text-[var(--muted)] mt-2 mb-3">
                {PRICE.balance} in cash on delivery · {PRICE.now} total, robot or kit
              </p>

              <p className="t-label mt-2 mb-0">{PRICE.ship}</p>

              <OrderSteps />

              <p className="text-[12.5px] text-[var(--muted)] mt-6 mb-0 pt-4 border-t"
                 style={{ borderColor: 'var(--line)' }}>
                {/* Named, not linked. The credit belongs here — a stranger
                    is about to be asked for money — but a link out of the
                    page one line above the pay button is the last thing this
                    panel should offer. The profiles are in the footer. */}
                Made by{' '}
                <span className="text-[var(--ink)] font-medium">
                  {BUILDERS.map((b) => b.name).join(' and ')}
                </span>
                , in Bengaluru. Two people, one batch.
              </p>

              <p className="text-[12.5px] text-[var(--muted)] mt-3 mb-0">
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
            <Image src="/brand/logo-horizontal-white.svg" alt="Pebble Robotics"
                   width={160} height={17} className="w-[150px] h-auto block mb-4" />
            <p className="text-[13.5px] text-[var(--muted)] mt-0 mb-3 max-w-[30ch]">
              The robot that lives on your desk.
            </p>
            <a href={`mailto:${CONTACT.email}`}
               className="t-mono text-[13px] mt-1 mb-0 inline-block text-[var(--ink)] underline underline-offset-4">
              {CONTACT.email}
            </a>

            <div className="t-label mt-8 mb-3">Built by</div>
            <ul className="list-none p-0 m-0 grid gap-1.5">
              {BUILDERS.map((b) => (
                <li key={b.href}>
                  <TrackedLink href={b.href} target="_blank" rel="noreferrer noopener"
                               event={EV.outboundClicked} props={{ to: `linkedin:${b.name}` }}
                               className="text-[13.5px] text-[var(--ink)] no-underline hover:underline underline-offset-4">
                    {b.name} ↗
                  </TrackedLink>
                </li>
              ))}
            </ul>
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
              profession. We use them to ship your order, to tell you when it is
              on its way, and — in Mixpanel — to follow up if an order does not
              complete. Card details go to Razorpay and never reach us. The
              courier is told your address and the balance to collect.
            </p>
            <p className="text-[13.5px] text-[var(--muted)] m-0 max-w-[36ch]">
              We record how this page is used — clicks, scrolling and session
              replays — and share some of it with Meta and X so our ads reach
              the right people. Meta is never given your name, email, phone or
              address. X is sent a one-way hash of your email and phone when you
              order — never the plain values, and never your name or address —
              so it can count the sale. What you type into the form is never captured by the
              session replay.
            </p>
          </div>
        </div>
      </footer>

      <BuyBar />
    </>
  )
}
