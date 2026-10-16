import type { Metadata } from 'next'
import Image from 'next/image'
import BuyBar from '@/components/BuyBar'
import Clip from '@/components/Clip'
import EditionDefault from '@/components/EditionDefault'
import PartArt from '@/components/PartArt'
import ReserveForm from '@/components/ReserveForm'
import { ChooseEdition, OrderSteps } from '@/components/OrderSteps'
import { TrackedLink } from '@/components/Tracked'
import { MotionRoot, Reveal } from '@/components/site/motion'
import SiteNav from '@/components/site/SiteNav'
import Footer from '@/components/site/Footer'
import Faq from '@/components/site/Faq'
import RealThing from '@/components/site/RealThing'
import { SpecGrid } from '@/components/site/Buy'
import { EV } from '@/lib/events'
import { visibleProof } from '@/lib/proof'
import {
  BUILD_STEPS, BUILDERS, CONTACT, EDITION, EDITIONS, PARTS, PRICE, SPEC_TABLES, type Faq as FaqItem,
} from '@/lib/kit'

/**
 * /kit: the same robot, for people who want to build it and program it.
 *
 * Developer ad campaigns land here. It leads with a photograph of real
 * robots, says plainly what the hardware is and whose software it runs, then
 * the parts, the build, the specs, both editions at the same price, and the
 * same order form as the home page with the edition left to the buyer.
 *
 * Every capability on this page is in docs/capabilities.md. Nothing that is
 * real but not shipping (vision Q&A, a wake word, games) is claimed here.
 */

const TITLE = 'Stack-chan kit on an M5Stack CoreS3 Lite | PebbleRobo for developers'
const DESCRIPTION =
  'Build Stack-chan, the open-source desk robot: an M5Stack CoreS3 Lite (ESP32-S3), two SCS0009 ' +
  'bus servos and a 3D-printed shell. Program it in JavaScript on the Moddable SDK, or Arduino and ' +
  `M5Unified in C++. Build-it-yourself kit or fully assembled, both ${PRICE.now}, ${PRICE.deposit} to book. ` +
  'Ships across India.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/kit' },
  keywords: [
    'Stack-chan', 'Stack-chan kit', 'M5Stack CoreS3 Lite', 'ESP32-S3 robot', 'SCS0009 bus servo',
    'Moddable SDK', 'M5Unified', 'Arduino robot kit', 'open source desk robot', 'robot kit India',
    'DIY robot kit India',
  ],
  openGraph: {
    type: 'website',
    url: 'https://pebblerobo.com/kit',
    siteName: 'PebbleRobo',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_IN',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'PebbleRobo, a Stack-chan robot, on a desk' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og.jpg'] },
}

const STACK_CHAN = 'https://github.com/meganetaaan/stack-chan'

/** What is on the board, in the words of docs/capabilities.md, with the part that provides it. */
const BOARD: [string, string, string][] = [
  ['Face and eyes', 'Animated expressions, blinking and gaze on a 2.0" 320 × 240 IPS display. Draw your own faces.', 'U1 · ILI9342C'],
  ['Two-axis head', 'Pan and tilt on two SCS0009 bus servos, each on its own address on one RS485 pair, with position readback.', 'M1 · M2 · A1'],
  ['Voice', 'Dual microphones on an ES7210 codec and a 1 W speaker on an AW88298 amplifier, for voice applications.', 'U1 · ES7210 · AW88298'],
  ['Touch', 'A capacitive touch display, and three-zone touch on the body.', 'U1 · FT6336U'],
  ['Camera', 'A GC0308 camera for video viewing and programmable vision features.', 'U1 · GC0308'],
  ['Connectivity', 'Wi-Fi, Bluetooth LE and NFC hardware. ESP-NOW for wireless remote control, and firmware updates over the air.', 'U1 · ESP32-S3'],
]

const DEV_FAQS: FaqItem[] = [
  { q: 'What exactly is this?',
    a: 'Stack-chan, the open-source desk robot by Shinya Ishikawa and contributors, built on an M5Stack CoreS3 Lite with two SCS0009 bus servos and a 3D-printed shell. We match the parts, print the shell, and address and centre the servos. It is not an official Stack-chan or M5Stack product, and the software is Stack-chan’s; we take no credit for it.' },
  { q: 'What can I program?',
    a: 'All of it: custom faces, firmware and applications. Stack-chan’s behaviour is JavaScript on the Moddable SDK. The controller is a stock CoreS3 Lite, so the Arduino core and M5Unified work too, in C++. The Stack-chan project is Apache License 2.0.' },
  { q: 'What is the difference between the kit and the assembled robot?',
    a: `Only who puts it together. Both have the same CoreS3 Lite, the same two servos, the same printed shell and the same power supply, and both cost ${PRICE.now}. The assembled robot is built and tested by us; the kit arrives as eight parts and takes an evening, with no soldering.` },
  { q: 'What do I need that is not in the box?',
    a: 'For the assembled robot, nothing: the power supply is included. For the kit, a USB-C cable and a computer to flash it. You never need a 3D printer; the shell is printed here and ships with both.' },
  { q: 'How do I flash it?',
    a: 'Pull the Stack-chan firmware, build it with the Moddable SDK and push it over USB-C. The face comes up and the head finds centre. After that, firmware can also be updated over the air.' },
  { q: 'Can I drive the servos myself?',
    a: 'Yes. Both are SCS0009 serial bus servos on one RS485 pair through the Waveshare driver, each on its own address, and each reports the position it actually reached. The servo supply is kept off the controller rail.' },
  { q: 'Does it need the internet?',
    a: `Its faces, its movement and its reactions to touch run on the robot. AI conversation runs over Wi-Fi, and so do updates and the phone app. If you want to know exactly how conversation is set up for your order, write to ${CONTACT.email} before you book.` },
  { q: 'How does ordering work?',
    a: `You pay ${PRICE.deposit} now to book, by card, UPI, netbanking or EMI. The remaining ${PRICE.balance} is paid in cash when it arrives. Delivery anywhere in India is free, and orders leave within 1–2 weeks of the batch closing.` },
  { q: 'What if it arrives broken, or a part is missing?',
    a: 'Write to us within 7 days of delivery. We take back a robot or kit that does not work (dead on arrival, damaged on the way, missing a part, or failing in normal use) and refund you within 7 working days of it reaching us. Often a photo or a short video lets us fix it with you in a reply. We do not take one back because you changed your mind. The full terms are on the returns page.' },
]

const LINKS: [string, string][] = [
  ['Hardware', '#hardware'],
  ['Parts', '#parts'],
  ['Build', '#build'],
  ['Specs', '#specs'],
  ['Editions', '#editions'],
  ['FAQ', '#faq'],
]

export default function KitPage() {
  const proof = visibleProof()

  return (
    <MotionRoot>
      <EditionDefault edition="kit" />
      <SiteNav links={LINKS} />

      <main id="top">
        {/* ================= HERO: a photograph, not a render ================= */}
        <section id="hero" className="relative" style={{ paddingTop: 'clamp(104px, 14vh, 160px)', paddingBottom: 'var(--section-y)' }}>
          <div className="wrap grid gap-10 lg:grid-cols-12 lg:gap-x-10 items-center">
            <div className="lg:col-span-6">
              <Reveal>
                <p className="t-label m-0 mb-6 flex items-center gap-3">
                  <span className="inline-block w-6 h-px" style={{ background: 'var(--accent)' }} aria-hidden="true" />
                  <span>For developers · open source</span>
                </p>
                <h1 className="t-display t-h1 m-0 max-w-[14ch]">
                  Stack-chan, on an M5Stack CoreS3&nbsp;Lite.
                </h1>
                <p className="t-lead mt-7 mb-0 max-w-[44ch]">
                  An ESP32-S3 with a touch display, camera, two microphones and a
                  speaker, on a two-servo neck in a printed shell. It runs the
                  open-source{' '}
                  <TrackedLink href={STACK_CHAN} target="_blank" rel="noreferrer noopener"
                               event={EV.outboundClicked} props={{ to: 'stack-chan repo', location: 'kit-hero' }}
                               className="link">Stack-chan</TrackedLink>{' '}
                  firmware, in JavaScript on the Moddable SDK, and Arduino and
                  M5Unified work too. Build it yourself, or have it arrive assembled.
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3 mt-9">
                  <ChooseEdition edition="kit" location="kit-hero" className="btn btn-brand hero-cta">
                    Book for {PRICE.deposit} <span className="arrow hidden sm:inline" aria-hidden="true">→</span>
                  </ChooseEdition>
                  <a href="#parts" className="btn btn-ghost hero-cta">See the parts</a>
                </div>
                <p className="t-mono text-[12.5px] text-[var(--muted)] mt-4 mb-0">
                  Kit or assembled · {PRICE.now} either way · {PRICE.deposit} to book, the rest on delivery
                </p>
              </Reveal>
            </div>

            <Reveal className="lg:col-span-5 lg:col-start-8" y={36}>
              <figure className="m-0 max-w-[460px] mx-auto">
                <div className="media" style={{ aspectRatio: '3 / 4' }}>
                  <Image src="/media/real/table-4335.jpg" priority fill quality={85}
                         sizes="(max-width: 1024px) 92vw, 460px" className="object-cover"
                         alt="Two finished robots, one white and one black, side by side on a dining table" />
                  <span className="tag absolute left-4 top-4 pointer-events-none">Photo</span>
                </div>
                <figcaption className="t-mono text-[11.5px] text-[var(--muted)] mt-3">
                  Two finished robots, white and black. Photographed, not rendered.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ================= HARDWARE ================= */}
        <section id="hardware" className="section scroll-mt-16" style={{ background: 'var(--surface)' }}>
          <div className="wrap grid lg:grid-cols-12 gap-x-10 gap-y-12">
            <Reveal className="lg:col-span-4">
              <p className="t-label m-0 mb-6">What is on the board</p>
              <h2 className="t-display t-h2 m-0">Stock parts, named exactly.</h2>
              <p className="text-[16px] text-[var(--muted)] mt-6 mb-0 max-w-[34ch]">
                Look every one of them up before you buy. Nothing here is
                proprietary, and nothing is locked.
              </p>
              <div className="media mt-8 hidden lg:block" style={{ aspectRatio: '16 / 9' }}>
                <Clip src="/media/unit-demo" poster="/media/unit-demo-poster.webp"
                      alt="A real robot on a desk, hearts on its screen" className="absolute inset-0" />
                <span className="tag absolute left-4 top-4 pointer-events-none">Real footage</span>
              </div>
            </Reveal>

            <div className="lg:col-span-8">
              <dl className="grid sm:grid-cols-2 gap-x-8 m-0">
                {BOARD.map(([k, v, src]) => (
                  <div key={k} className="py-5 border-t" style={{ borderColor: 'var(--line)' }}>
                    <dt className="flex items-baseline justify-between gap-3">
                      <span className="text-[18px] font-medium tracking-[-0.015em]">{k}</span>
                      <span className="t-mono text-[11px] text-[var(--muted)] shrink-0">{src}</span>
                    </dt>
                    <dd className="m-0 mt-1.5 text-[14.5px] leading-[1.55] text-[var(--muted)]">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="grid gap-3 sm:grid-cols-3 mt-10">
                {[
                  ['Stack-chan', 'The project this robot is. Apache-2.0.', STACK_CHAN],
                  ['Moddable SDK', 'The JavaScript runtime the firmware uses.', 'https://www.moddable.com/'],
                  ['CoreS3 Lite', 'The controller’s datasheet, from M5Stack.', 'https://docs.m5stack.com/en/core/CoreS3-Lite'],
                ].map(([title, body, href]) => (
                  <TrackedLink key={href} href={href} target="_blank" rel="noreferrer noopener"
                               event={EV.outboundClicked} props={{ to: title, location: 'kit' }}
                               className="card p-5 no-underline text-[var(--ink)] block">
                    <span className="t-display text-[19px] block">{title} <span aria-hidden="true">↗</span></span>
                    <span className="text-[14px] text-[var(--muted)] block mt-2">{body}</span>
                  </TrackedLink>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= PARTS ================= */}
        <section id="parts" className="section scroll-mt-16">
          <div className="wrap">
            <Reveal>
              <p className="t-label m-0 mb-6">In the box</p>
              <h2 className="t-display t-h2 m-0 max-w-[16ch]">{PARTS.length} parts. Nothing else to buy.</h2>
              <p className="t-lead mt-6 mb-0 max-w-[46ch]">
                Including the printed shell and the fasteners. For the kit, you
                supply a USB-C cable and a computer.
              </p>
            </Reveal>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 list-none p-0 m-0 mt-12">
              {PARTS.map((p) => (
                <li key={p.desig} className="card p-4 flex gap-4 items-start">
                  <span className="w-[56px] h-[56px] shrink-0 rounded-lg grid place-items-center overflow-hidden"
                        style={{ background: 'var(--surface-2)' }}>
                    <span className="block w-[82%]"><PartArt kind={p.art} /></span>
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="t-mono text-[10.5px] text-[var(--muted)]">{p.desig}</span>
                      <span className="t-mono text-[10.5px] text-[var(--muted)]">{p.qty}</span>
                    </span>
                    <span className="block text-[14px] font-semibold leading-tight mt-1">{p.name}</span>
                    <span className="block text-[13px] leading-[1.5] text-[var(--muted)] mt-1.5">{p.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ================= BUILD ================= */}
        <section id="build" className="section scroll-mt-16" style={{ background: 'var(--surface)' }}>
          <div className="wrap grid lg:grid-cols-12 gap-x-10 gap-y-12 items-start">
            <div className="lg:col-span-7">
              <Reveal>
                <p className="t-label m-0 mb-6">How you build it</p>
                <h2 className="t-display t-h2 m-0">Four steps, one evening.</h2>
                <p className="t-lead mt-6 mb-0 max-w-[40ch]">In order, because the order matters. No soldering.</p>
              </Reveal>
              <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-2 list-none p-0 m-0 mt-10">
                {BUILD_STEPS.map((s) => (
                  <li key={s.n} className="pt-5 pb-4 border-t" style={{ borderColor: 'var(--ink)' }}>
                    <span className="t-mono text-[13px] text-[var(--muted)]">{String(s.n).padStart(2, '0')}</span>
                    <h3 className="t-display text-[22px] mt-3 mb-2">{s.title}</h3>
                    <p className="text-[14.5px] leading-[1.6] text-[var(--muted)] m-0">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* The assembly footage: an unretouched phone video of a kit going
                together. Plain controls, muted until the viewer asks. */}
            <Reveal className="lg:col-span-4 lg:col-start-9" y={36}>
              <figure className="m-0 max-w-[360px] mx-auto">
                <div className="media" style={{ aspectRatio: '9 / 16', background: '#0e0e0e' }}>
                  <video className="absolute inset-0 w-full h-full object-cover"
                         poster="/media/build-poster.webp" muted loop playsInline preload="none" controls
                         aria-label="A kit going together, real footage">
                    <source src="/media/build.webm" type="video/webm" />
                    <source src="/media/build.mp4" type="video/mp4" />
                  </video>
                  <span className="tag absolute left-4 top-4 pointer-events-none">Real footage</span>
                </div>
                <figcaption className="t-mono text-[11.5px] text-[var(--muted)] mt-3">
                  One kit going together, unedited
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ================= REAL ================= */}
        <RealThing id="real" label="Finished" title="What it becomes."
                   lead="The same robot, built: one black, one white, on an ordinary table. And a video call from the phone app." />

        {/* ================= SPECS ================= */}
        <section id="specs" className="section scroll-mt-16" style={{ background: 'var(--surface)' }}>
          <div className="wrap">
            <Reveal>
              <p className="t-label m-0 mb-6">Specifications</p>
              <h2 className="t-display t-h2 m-0">Read the whole datasheet.</h2>
            </Reveal>
            <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2 mt-12">
              {SPEC_TABLES.map((t) => (
                <div key={t.title} className="min-w-0">
                  <p className="t-label m-0 mb-2 flex gap-3">
                    <span>{t.title}</span>
                    {t.desig !== '-' && <span className="text-[var(--muted-2)]">{t.desig}</span>}
                  </p>
                  <div className="overflow-x-auto">
                    {/* Expressions are shown, not counted, here: the count is
                        firmware-dependent and this page only states hardware. */}
                    <SpecGrid table={{ ...t, rows: t.rows.filter((r) => r.label !== 'Expressions') }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= EDITIONS ================= */}
        <section id="editions" className="section scroll-mt-16">
          <div className="wrap">
            <Reveal>
              <p className="t-label m-0 mb-6">Two ways to have one</p>
              <h2 className="t-display t-h2 m-0 max-w-[16ch]">Same robot. Same price.</h2>
              <p className="t-lead mt-6 mb-0 max-w-[44ch]">
                {PRICE.now} for either, with {PRICE.deposit} to book and {PRICE.balance} in
                cash on delivery. The only difference is who puts it together.
              </p>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-2 mt-12">
              {[...EDITIONS].reverse().map((e) => (
                <article key={e} className="card p-7 md:p-8 flex flex-col">
                  <p className="t-label m-0">{EDITION[e].assembly}</p>
                  <h3 className="t-display t-h3 mt-4 mb-2">{EDITION[e].label}</h3>
                  <p className="text-[15.5px] text-[var(--muted)] m-0">{EDITION[e].pitch}</p>
                  <p className="text-[14px] leading-[1.55] m-0 mt-5 pt-5 border-t" style={{ borderColor: 'var(--line)' }}>
                    {EDITION[e].prep}
                  </p>
                  <div className="flex items-end gap-x-6 gap-y-2 flex-wrap mt-7">
                    <div>
                      <p className="t-label m-0 mb-1.5">Book today</p>
                      <span className="t-display text-[40px] leading-none" style={{ color: 'var(--accent)' }}>{PRICE.deposit}</span>
                    </div>
                    <div className="pb-1">
                      <p className="t-label m-0 mb-1.5">Full price</p>
                      <span className="t-display text-[22px] leading-none">{PRICE.now}</span>
                    </div>
                  </div>
                  <ChooseEdition edition={e} location={`kit-editions-${e}`} className="btn btn-brand btn-lg mt-7 self-start">
                    Book {e === 'kit' ? 'the kit' : 'it assembled'} for {PRICE.deposit} <span className="arrow" aria-hidden="true">→</span>
                  </ChooseEdition>
                  <p className="t-mono text-[11.5px] text-[var(--muted)] mt-3 mb-0">SKU {EDITION[e].sku}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <Faq faqs={DEV_FAQS} title="Questions builders ask." />

        {/* ================= ORDER ================= */}
        <section id="reserve" className="section scroll-mt-20" style={{ paddingTop: 'clamp(64px, 8vw, 120px)' }}>
          <div className="wrap grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="t-label m-0 mb-6">Order</p>
              <h2 className="t-display t-h2 m-0 mb-5">Book yours.</h2>
              <p className="t-lead mt-0 mb-12 max-w-[42ch]">
                Kit or assembled, your details and your colour. It takes about a minute.
              </p>
              <ReserveForm chooseEdition />
            </div>

            <aside className="lg:col-span-5 card p-7 md:p-8 h-fit lg:sticky lg:top-28">
              <p className="t-label m-0">What happens next</p>
              <OrderSteps />
              <p className="text-[13.5px] text-[var(--muted)] mt-7 mb-0 pt-5 border-t" style={{ borderColor: 'var(--line)' }}>
                Made by <span className="text-[var(--ink)] font-medium">{BUILDERS.map((b) => b.name).join(' and ')}</span>,
                in Bengaluru. Questions first? Write to{' '}
                <a href={`mailto:${CONTACT.email}`} className="link">{CONTACT.email}</a>.
              </p>
            </aside>
          </div>
        </section>
      </main>

      <Footer socials={proof.socials}
              product={[['Hardware', '#hardware'], ['Parts', '#parts'], ['Build', '#build'], ['Specifications', '#specs'], ['Editions', '#editions'], ['The robot, for everyone', '/']]} />
      <BuyBar location="kit-buybar" />
    </MotionRoot>
  )
}
