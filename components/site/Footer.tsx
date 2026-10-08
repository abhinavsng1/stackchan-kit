import Link from 'next/link'
import Wordmark from '@/components/site/Wordmark'
import { SplitHeadline } from '@/components/site/motion'
import { TrackedLink } from '@/components/Tracked'
import { EV } from '@/lib/events'
import { BUILDERS, CONTACT, PRICE } from '@/lib/kit'
import type { Social } from '@/lib/proof'

/**
 * The end of the story: one last line, one last way to act, then everything
 * a footer is for — set as an index rather than a wall of links.
 */
export default function Footer({ socials }: { socials: Social[] }) {
  const columns: [string, [string, string][]][] = [
    ['Product', [['Meet it', '#meet'], ['What it does', '#does'], ['What’s inside', '#inside'], ['Specifications', '#specs'], ['Buy', '#buy']]],
    ['Support', [['FAQ', '#faq'], ['Shipping', '/shipping'], ['Returns', '/returns'], ['Contact', '/contact']]],
    ['Legal', [['Terms of sale', '/terms'], ['Privacy', '/privacy']]],
  ]

  return (
    <footer className="on-stage pb-28 lg:pb-10" style={{ paddingTop: 'var(--section-y)' }}>
      <div className="wrap">
        <SplitHeadline as="p" className="t-display t-h1 m-0 max-w-[14ch]"
                       text={'Your desk is\nwaiting for it.'} accent={['it.']} />
        <div className="flex flex-wrap items-center gap-3 mt-10">
          <a href="#buy" className="btn btn-accent btn-lg">
            Buy PebbleRobo · {PRICE.now} <span className="arrow" aria-hidden="true">→</span>
          </a>
          <a href={`mailto:${CONTACT.email}`} className="btn btn-ghost btn-lg">Ask us anything</a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-8 gap-y-12 mt-24 md:mt-32 pt-12 border-t"
             style={{ borderColor: 'var(--line)' }}>
          <div className="col-span-2 md:col-span-4">
            <Wordmark size={26} invert />
            <p className="text-[15px] text-[var(--muted)] mt-5 mb-0 max-w-[30ch]">
              A little robot that looks back. Designed and built in Bengaluru by{' '}
              {BUILDERS.map((b, i) => (
                <span key={b.href}>
                  {i > 0 && ' and '}
                  <TrackedLink href={b.href} target="_blank" rel="noreferrer noopener"
                               event={EV.outboundClicked} props={{ to: `linkedin:${b.name}` }}
                               className="text-[var(--ink)] underline underline-offset-4 decoration-[var(--line)] hover:decoration-[var(--ink)]">
                    {b.name}
                  </TrackedLink>
                </span>
              ))}.
            </p>
            <a href={`mailto:${CONTACT.email}`} className="t-mono inline-block mt-5 text-[13px] text-[var(--ink)] link">
              {CONTACT.email}
            </a>
          </div>

          {columns.map(([title, links]) => (
            <nav key={title} className="md:col-span-2" aria-label={title}>
              <p className="t-label m-0 mb-4">{title}</p>
              <ul className="list-none p-0 m-0 grid gap-2.5">
                {links.map(([label, href]) => (
                  <li key={href}>
                    {href.startsWith('/')
                      ? <Link href={href} className="link-quiet text-[15px]">{label}</Link>
                      : <a href={href} className="link-quiet text-[15px]">{label}</a>}
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {socials.length > 0 && (
            <nav className="md:col-span-2" aria-label="Social">
              <p className="t-label m-0 mb-4">Follow</p>
              <ul className="list-none p-0 m-0 grid gap-2.5">
                {socials.map((s) => (
                  <li key={s.id}>
                    <a href={s.href} target="_blank" rel="noreferrer noopener" className="link-quiet text-[15px]">
                      {s.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        <div className="mt-16 pt-6 border-t grid gap-4 md:grid-cols-2 text-[12.5px] leading-[1.6] text-[var(--muted)]"
             style={{ borderColor: 'var(--line)' }}>
          <p className="m-0 max-w-[60ch]">
            Based on{' '}
            <TrackedLink href="https://github.com/meganetaaan/stack-chan" target="_blank" rel="noreferrer noopener"
                         event={EV.outboundClicked} props={{ to: 'stack-chan repo' }}
                         className="underline underline-offset-4">Stack-chan</TrackedLink>{' '}
            by Shinya Ishikawa and contributors, used under the Apache License 2.0. PebbleRobo is
            not an official Stack-chan or M5Stack product.
          </p>
          <p className="m-0 max-w-[60ch] md:justify-self-end">
            Ordering stores your name, email, phone and shipping address to deliver your order,
            and in Mixpanel to follow up if an order does not complete. This page records how it is
            used — clicks, scrolling and session replays — and shares some of it with Meta and X so
            our ads reach the right people. Meta is never given your name, email, phone or
            address; X gets a one-way hash of your email and phone when you order. What you type
            into the form is never captured by the session replay. Card details go to Razorpay
            and never reach us.
          </p>
        </div>
        <p className="t-mono text-[11.5px] text-[var(--muted-2)] mt-8 mb-0">
          © {new Date().getFullYear()} {CONTACT.entity}
        </p>
      </div>
    </footer>
  )
}
