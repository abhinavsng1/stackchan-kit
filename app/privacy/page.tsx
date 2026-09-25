import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { CONTACT } from '@/lib/kit'

export const metadata: Metadata = {
  title: 'Privacy · Pebble Robo',
  description:
    'What Pebble Robo stores when you order a Pebble-chan kit, what is measured on the site, and how to have it deleted.',
  alternates: { canonical: '/privacy' },
}

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="25 September 2026">
      <div className="keyfact">
        <p>
          We store what is needed to ship you a box, and nothing else. We do not sell your
          details or pass them to anyone who is not delivering your order.
        </p>
      </div>

      <h2>What we store when you order</h2>
      <ul>
        <li><strong>Name, email, phone</strong> — to identify the order and tell you when it ships.</li>
        <li><strong>Shipping address, city, PIN code</strong> — to put on the parcel.</li>
        <li><strong>Profession</strong> — optional, and only so we know who the kit is reaching. Leave it blank.</li>
        <li><strong>Quantity, amount paid, and the payment id</strong> — the record of the sale.</li>
      </ul>
      <p>
        This sits in a Postgres database hosted by Neon. It is kept while we may still need
        it for the order, a return, or tax records, and is deleted when none of those apply.
      </p>

      <h2>What we never see</h2>
      <p>
        <strong>Your card details.</strong> Payment is handled entirely by Razorpay; the
        number never touches our servers. We receive only a payment id and the amount.
      </p>

      <h2>What is measured on the site</h2>
      <p>
        We record how the page is used — which sections are viewed, what is clicked, how far
        people scroll, and where a payment fails — using{' '}
        <a href="https://mixpanel.com/legal/privacy-policy/" target="_blank" rel="noreferrer noopener">Mixpanel</a>{' '}
        and the{' '}
        <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer noopener">Meta Pixel</a>.
        This is how we find out that a page is confusing, or that nobody can pay.
      </p>
      <p>
        Mixpanel also records session replays — a reconstruction of mouse movement and
        scrolling. <strong>Text you type into the form is masked and is not recorded.</strong>{' '}
        Neither tool is sent your name, phone, address, or the amount you paid.
        Your email address is not sent either — but a{' '}
        <strong>one-way cryptographic hash</strong> of it is, so that the same buyer on a
        phone and a laptop is counted as one person rather than two. The hash cannot be
        turned back into your address.
      </p>
      <p>
        Some of this is shared with Meta so that advertising reaches people likely to want a
        robot kit. If you would rather not be measured, the browser-level{' '}
        <a href="https://globalprivacycontrol.org/" target="_blank" rel="noreferrer noopener">Global Privacy Control</a>{' '}
        signal and standard tracker blockers both work here; nothing on the site depends on
        analytics running.
      </p>

      <h2>Email</h2>
      <p>
        We email you once, to confirm an order that has been paid for, and again when it
        ships. That is transactional, not marketing. There is no newsletter and no list, so
        there is nothing to unsubscribe from. Email is delivered by{' '}
        <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer noopener">Resend</a>.
      </p>

      <h2>Who else touches your data</h2>
      <ul>
        <li><strong>Razorpay</strong> — payment processing.</li>
        <li><strong>Neon</strong> — the database your order is stored in.</li>
        <li><strong>Vercel</strong> — hosting; sees standard request logs.</li>
        <li><strong>Resend</strong> — sends the order emails.</li>
        <li><strong>The courier</strong> — gets your name, address and phone, because that is how a parcel arrives.</li>
        <li><strong>Mixpanel and Meta</strong> — site usage, never your order details.</li>
      </ul>
      <p>Nobody else. We do not sell data and we do not share it for anyone else&apos;s advertising.</p>

      <h2>Your data, on request</h2>
      <p>
        Write to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and ask for a copy of
        what we hold, a correction, or deletion. We will do it within 30 days. If your order
        has shipped we may need to keep the sale record for tax purposes, and we will say so
        rather than quietly keeping it.
      </p>

      <h2>Children</h2>
      <p>
        The kit is sold to adults. We do not knowingly collect details from anyone under 18.
      </p>

      <h2>Changes</h2>
      <p>
        If this page changes, the date at the top changes with it. We will not change it
        retroactively to cover something we have already done.
      </p>
    </LegalPage>
  )
}
