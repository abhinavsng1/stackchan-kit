import { cookies, headers } from 'next/headers'
import type { Metadata } from 'next'
import { VARIANT_COOKIE, assignVariant, isVariant, pricing, SUBSCRIPTION_TERMS } from '@/lib/variants'
import { recordVariantView, looksLikeBot } from '@/lib/variant-views'
import { CONTACT } from '@/lib/kit'
import ReserveForm from '@/components/ReserveForm'
import PebbleHero from './PebbleHero'
import FaceWall from './FaceWall'
import MoodSequence from './MoodSequence'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pebble-chan, a small robot that lives on your desk',
  description:
    'Assembled, flashed and tested. A palm-sized robot with twelve expressions, a head '
    + 'that turns to find you, and a voice. ₹499 to prebook, the rest on delivery.',
  alternates: { canonical: 'https://pebblerobo.com/pebble-chan' },
}

const STILLS = [
  { src: '/media/pebble/still-9.webp', alt: 'Pebble-chan looking ahead on a desk' },
  { src: '/media/pebble/still-21.webp', alt: 'Pebble-chan winking, head tilted' },
  { src: '/media/pebble/still-37.webp', alt: 'Pebble-chan turned to one side' },
  { src: '/media/pebble/still-51.webp', alt: 'Pebble-chan smiling beside a plant' },
]

const DOES = [
  ['It notices you',
   'Sit down and it looks up. Walk past and it follows you with its head. It is doing this on its own, all day, without being told to.'],
  ['It has moods',
   'Twelve of them. Pleased, curious, sleepy, unimpressed. Which one you get depends on what is going on around it.'],
  ['It listens, and answers',
   'Ask it something out loud and it answers out loud. No app, no wake word to memorise, no phone involved.'],
  ['It just sits there, happily',
   'No charging, no pairing, no account. One cable to the wall and it gets on with it.'],
]

/**
 * A day, in order, because that is the honest shape of the question "what do I
 * actually do with it". Every scene is behaviour the robot has: it tracks a
 * face, it picks its own expressions, it answers out loud, it dozes when the
 * room empties. Nothing here is a feature we intend to ship.
 */
const DAY = [
  ['Morning',
   'You sit down',
   'It has been dozing. The head comes up, finds your face and stays with it while you get settled. You did not press anything and there was nothing to unlock.'],
  ['Through the day',
   'It reacts while you work',
   'You are not watching it, which is the point. It is curious at a noise, pleased when you come back, unimpressed by the afternoon. You catch it out of the corner of your eye and it has changed its mind again.'],
  ['When you are stuck',
   'You ask it out loud',
   'No app, no wake word to remember, no reaching for a phone. You say the thing, it answers in the room. Hands stay on the keyboard.'],
  ['When someone visits',
   'It is the thing people pick up',
   'Children go straight for the screen. It is a touchscreen and it reacts to being prodded. It is the first object on the desk anyone asks about, and the answer is never boring.'],
  ['Late',
   'The room empties and it settles',
   'A few minutes with nobody about and it goes sleepy on its own. Leave it on. It draws about as much as a phone charger and it is awake again when you are.'],
]

const FAQS_PRODUCT = [
  ['How big is it?',
   'Small. The body is about the width of a credit card and it stands roughly as tall as a coffee mug, base included. It weighs less than a paperback and takes up about as much desk as a mug would.'],
  ['What do I have to do to set it up?',
   'Take it out of the box, plug the cable into a wall socket, and tell it your Wi-Fi once. That is the whole thing. It is awake by the time you have put the box down.'],
  ['Is it noisy?',
   'The head makes a soft whirr when it turns, quieter than a laptop fan. You can mute the voice entirely and keep the faces and the movement.'],
  ['Will it work without internet?',
   'Yes, for the faces and the movement. It does not phone home to look at you. Talking needs Wi-Fi, because the answers come from our service.'],
  ['Is it safe around children and pets?',
   'There is nothing sharp, nothing hot, and no exposed battery. The head has no pinch points you could get a finger into. It is not a toy, though, and the cable is still a cable.'],
  ['What if something goes wrong with it?',
   `Tell us and we replace it. Write to ${CONTACT.email} with a photo. There is no form and no ticket number. Every one of these is built by hand by two people, so you will be talking to whoever made yours.`],
]

export default async function PebbleChan() {
  const jar = await cookies()
  const raw = jar.get(VARIANT_COOKIE)?.value ?? ''
  const variant = isVariant(raw) ? raw : assignVariant()
  const p = pricing(variant)
  const subscribed = variant === 'subscription'

  const h = await headers()
  if (!looksLikeBot(h.get('user-agent'))) await recordVariantView(variant).catch(() => {})

  return (
    <main id="top" className="pebble-dark">
      <PebbleHero variant={variant} />

      {/* The one loud moment: the product's own screen, twelve times. */}
      <MoodSequence fallback={<FaceWall />} />

      {/* ---- arrives awake: a strip of real stills, not a column of air ---- */}
      <section className="wrap-wide py-16 md:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 items-end mb-10">
          <h2 className="t-display mt-0 mb-0" style={{ fontSize: 'clamp(30px,3.4vw,48px)', lineHeight: 1.03 }}>
            It arrives awake.
          </h2>
          <p className="text-[16px] leading-[26px] text-[var(--muted)] m-0 max-w-[58ch]">
            Not a kit and not a weekend. Everything is already done: parts matched,
            shell printed, both servos addressed and centred, firmware flashed. We
            switch each one on and watch it before it goes in the box. Take it out,
            plug it in, and it looks up.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {STILLS.map((s) => (
            <figure key={s.src} className="m-0 overflow-hidden"
                    style={{ borderRadius: 16, background: 'var(--surface-2)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} loading="lazy" decoding="async"
                   className="w-full h-auto block" />
            </figure>
          ))}
        </div>
      </section>

      {/* ---- what it is like to have one, told without a part number ---- */}
      <section className="py-16 md:py-24" style={{ background: 'var(--surface)' }}>
        <div className="wrap-wide">
          <h2 className="t-display mt-0 mb-10 md:mb-14" style={{ fontSize: 'clamp(30px,3.4vw,48px)', lineHeight: 1.03 }}>
            What it is like to have one.
          </h2>
          <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
            {DOES.map(([title, body]) => (
              <div key={title} className="max-w-[46ch]">
                <h3 className="t-display text-[22px] md:text-[26px] mt-0 mb-2.5">{title}</h3>
                <p className="text-[15.5px] leading-[26px] text-[var(--muted)] m-0">{body}</p>
              </div>
            ))}
          </div>
          {subscribed && (
            <p className="text-[14px] text-[var(--muted)] mt-10 mb-0 max-w-[60ch]">
              Talking is the part that needs a subscription. The faces, the movement
              and everything else work whether you subscribe or not.
            </p>
          )}
        </div>
      </section>

      {/* ---- a day with it: the use cases, in the order they happen ---- */}
      <section className="wrap-wide py-16 md:py-24">
        <div className="max-w-[48ch] mb-12 md:mb-16">
          <h2 className="t-display mt-0 mb-4" style={{ fontSize: 'clamp(30px,3.4vw,48px)', lineHeight: 1.03 }}>
            A day with one on the desk.
          </h2>
          <p className="text-[16px] leading-[26px] text-[var(--muted)] m-0">
            It is not something you use. It is something that is there, doing its own
            thing, while you do yours.
          </p>
        </div>

        <ol className="list-none p-0 m-0">
          {DAY.map(([when, title, body], i) => (
            <li
              key={title}
              className="grid gap-x-10 gap-y-2 md:grid-cols-[13ch_minmax(0,1fr)] py-7 md:py-8"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}
            >
              <p className="t-mono text-[12px] uppercase tracking-[.08em] text-[var(--muted)] m-0 md:pt-1.5">
                {when}
              </p>
              <div className="max-w-[62ch]">
                <h3 className="t-display text-[22px] md:text-[27px] mt-0 mb-2">{title}</h3>
                <p className="text-[15.5px] leading-[26px] text-[var(--muted)] m-0">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- the price, and the honest half of it ---- */}
      <section id="price" className="wrap-wide py-16 md:py-24 scroll-mt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-16 items-start">
          <div>
            <h2 className="t-display mt-0 mb-5" style={{ fontSize: 'clamp(30px,3.4vw,48px)', lineHeight: 1.03 }}>
              {subscribed ? `${p.total} for the robot, ${p.monthly} a month to talk.` : `${p.total}, and that is all of it.`}
            </h2>
            <p className="text-[16px] leading-[26px] text-[var(--muted)] m-0 mb-8 max-w-[52ch]">
              {subscribed
                ? `${p.deposit} prebooks one. ${p.balance} in cash when it reaches you. The monthly starts after delivery.`
                : `${p.deposit} prebooks one. ${p.balance} in cash when it reaches you. No subscription, no account, nothing after that.`}
            </p>

            <div className="card p-6 md:p-7">
              {subscribed ? (
                <>
                  <p className="text-[15px] font-semibold m-0 mb-4">
                    What {p.monthly} a month covers
                  </p>
                  <ul className="list-none p-0 m-0 mb-6 grid gap-2.5">
                    {SUBSCRIPTION_TERMS.includes.map((i) => (
                      <li key={i} className="text-[14.5px] leading-[22px]">{i}</li>
                    ))}
                  </ul>
                  <p className="text-[14px] leading-[22px] m-0 pt-5 border-t" style={{ borderColor: 'var(--line)' }}>
                    <strong className="font-semibold">Stop paying and it keeps working.</strong>{' '}
                    {SUBSCRIPTION_TERMS.keeps} {SUBSCRIPTION_TERMS.loses} The robot is
                    yours. We do not take it back and we cannot switch it off.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-semibold m-0 mb-3">Nothing recurring</p>
                  <p className="text-[14.5px] leading-[23px] text-[var(--muted)] m-0">
                    Voice, the answers behind it, and every update are included for the
                    life of the device. No account to keep, nothing to renew, and no way
                    for us to switch it off later.
                  </p>
                </>
              )}
            </div>
          </div>

          <aside className="p-6 md:p-7 lg:sticky lg:top-24"
                 style={{ borderRadius: 'var(--radius-tile)', background: 'var(--ink)', color: 'var(--bg)' }}>
            <div className="flex items-baseline gap-3">
              <span className="t-display text-[46px] leading-none">{p.deposit}</span>
              <span className="text-[14px]" style={{ opacity: .6 }}>to prebook</span>
            </div>
            <dl className="grid gap-0 mt-6 mb-7 m-0">
              {([
                ['On delivery, in cash', p.balance],
                ['The robot', p.total],
                ...(subscribed ? [['Monthly, after delivery', p.monthly]] : []),
                ['Dispatch', '2–3 weeks'],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5"
                     style={{ borderBottom: '1px solid color-mix(in srgb, var(--bg) 16%, transparent)' }}>
                  <dt className="text-[13.5px]" style={{ opacity: .6 }}>{k}</dt>
                  <dd className="t-mono text-[13px] m-0">{v}</dd>
                </div>
              ))}
            </dl>
            <a href="#prebook" className="btn w-full justify-center"
               style={{ background: 'var(--bg)', borderColor: 'var(--bg)', color: 'var(--ink)', borderRadius: 999 }}>
              Prebook for {p.deposit}
            </a>
          </aside>
        </div>
      </section>

      {/* ---- the kit, mentioned rather than merchandised ---- */}
      <section className="py-14 md:py-16" style={{ background: 'var(--surface)' }}>
        <div className="wrap-wide max-w-[64ch]">
          <h2 className="t-display mt-0 mb-4" style={{ fontSize: 'clamp(24px,2.4vw,32px)', lineHeight: 1.1 }}>
            Would you rather build it?
          </h2>
          <p className="text-[15.5px] leading-[26px] text-[var(--muted)] m-0">
            The same robot is sold as a kit: the same parts, unassembled, with an
            evening of work between you and a working one. It costs about the same.
            You are only deciding whether building it is the fun part or the annoying
            part.{' '}
            <a href="/" className="text-[var(--ink)] underline underline-offset-4">See the kit</a>.
          </p>
        </div>
      </section>

      {/* ---- the practical questions a buyer actually has ---- */}
      <section className="wrap-wide py-16 md:py-24">
        <h2 className="t-display mt-0 mb-10" style={{ fontSize: 'clamp(30px,3.4vw,48px)', lineHeight: 1.03 }}>
          In the box.
        </h2>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['The robot', 'Built, flashed and switched on once to check it behaves before it is wrapped.'],
            ['A power adapter', 'Indian plug, right length of cable. Nothing else to buy.'],
            ['A card', 'Three steps to get started, in plain words. You will not need it twice.'],
            ['Nothing to assemble', 'No screws, no tools, no instructions to lose. It comes out of the box finished.'],
          ] as const).map(([t, b]) => (
            <div key={t}>
              <h3 className="text-[16px] font-semibold mt-0 mb-2">{t}</h3>
              <p className="text-[14.5px] leading-[23px] text-[var(--muted)] m-0">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- prebook ---- */}
      <section id="prebook" className="py-16 md:py-24 scroll-mt-20" style={{ background: 'var(--surface)' }}>
        <div className="wrap-wide grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)] lg:gap-16">
          <div>
            <h2 className="t-display mt-0 mb-5" style={{ fontSize: 'clamp(30px,3.4vw,48px)', lineHeight: 1.03 }}>
              {p.deposit} holds one.
            </h2>
            <p className="text-[16px] leading-[26px] text-[var(--muted)] mt-0 mb-8 max-w-[48ch]">
              {p.balance} in cash when it reaches you
              {subscribed ? `, then ${p.monthly} a month for the voice.` : '. Nothing after that.'}
            </p>
            <ReserveForm variant={variant} />
          </div>

          <aside className="h-fit lg:sticky lg:top-24">
            <p className="text-[15px] font-semibold m-0 mb-5">What happens next</p>
            <ol className="m-0 p-0 list-none grid gap-5">
              {([
                ['You prebook', `Your details and ${p.deposit}, on this page.`],
                ['We build yours', 'Matched, printed, addressed, flashed and watched.'],
                ['We ship it', 'Dispatch within 2–3 weeks, with tracking.'],
                ['You pay the rest', `${p.balance} in cash to the courier.`],
                ...(subscribed ? [['Then monthly', `${p.monthly}, starting after it arrives.`]] : []),
              ] as const).map(([t, b], i) => (
                <li key={t} className="flex gap-4">
                  <span className="t-mono text-[12px] text-[var(--muted)] pt-[3px] shrink-0 w-[18px]">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold">{t}</span>
                    <span className="block text-[13.5px] text-[var(--muted)] mt-1">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      {/* ---- questions ---- */}
      <section className="wrap-wide py-16 md:py-24">
        <h2 className="t-display mt-0 mb-10" style={{ fontSize: 'clamp(30px,3.4vw,48px)', lineHeight: 1.03 }}>
          Before you ask.
        </h2>
        <dl className="m-0 grid gap-0 max-w-[80ch]">
          {FAQS_PRODUCT.map(([q, a]) => (
            <div key={q} className="py-6 border-t" style={{ borderColor: 'var(--line)' }}>
              <dt className="text-[17px] font-semibold mb-2">{q}</dt>
              <dd className="m-0 text-[15px] leading-[25px] text-[var(--muted)] max-w-[66ch]">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t py-10" style={{ borderColor: 'var(--line)' }}>
        <div className="wrap-wide flex flex-wrap gap-x-8 gap-y-2 items-baseline">
          <a href="/" className="text-[13.5px] text-[var(--ink)] underline underline-offset-4">
            The kit, if you would rather build it
          </a>
          <a href={`mailto:${CONTACT.email}`} className="t-mono text-[13px] text-[var(--muted)] no-underline hover:underline">
            {CONTACT.email}
          </a>
        </div>
      </footer>
    </main>
  )
}
