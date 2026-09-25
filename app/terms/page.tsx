import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { CONTACT, PRICE } from '@/lib/kit'

export const metadata: Metadata = {
  title: 'Terms of sale · Pebble Robo',
  description: 'The terms on which Pebble Robo sells the Pebble-chan build kit.',
  alternates: { canonical: '/terms' },
}

export default function Terms() {
  return (
    <LegalPage title="Terms of sale" updated="25 September 2026">
      <p>
        These terms apply when you buy a Pebble-chan kit from {CONTACT.entity}. They are
        written to be read, not to be survived.
      </p>

      <h2>What you are buying</h2>
      <p>
        A <strong>build kit</strong>: a box of parts you assemble yourself. It does not
        arrive working. Assembly takes an evening and needs no soldering, no printing and no
        tools beyond a small screwdriver, but it is work you do.
      </p>
      <p>
        Pebble-chan is built around the open-source{' '}
        <a href="https://github.com/meganetaaan/stack-chan" target="_blank" rel="noreferrer noopener">
          Stack-chan</a>{' '}
        project by Shinya Ishikawa and contributors, used under the Apache License 2.0. It is{' '}
        <strong>not</strong> the official M5Stack Stack-chan product, which is a different,
        pre-assembled device. We take no credit for the software.
      </p>

      <h2>Price and payment</h2>
      <p>
        {PRICE.now} per kit, inclusive of delivery within India. Payment is taken on the page
        by <a href="https://razorpay.com" target="_blank" rel="noreferrer noopener">Razorpay</a>{' '}
        — card, UPI, netbanking or EMI. Your card details go to Razorpay and never reach us.
      </p>
      <p>
        Your order is confirmed when the payment settles, not when the form is submitted. If a
        payment fails you are not charged and no order exists.
      </p>
      <p>
        Prices can change. The price shown when you pay is the price of your order, and a later
        change does not affect an order already placed.
      </p>

      <h2>Batches and availability</h2>
      <p>
        Kits are made in batches. If a batch sells out or a component becomes unobtainable, we
        will tell you and refund you in full rather than substituting a part you did not choose.
      </p>

      <h2>What we promise</h2>
      <p>
        That every part arrives present and working, that the specifications published on this
        site are accurate and taken from supplier documentation rather than marketing, and that
        the kit assembles into the robot shown.
      </p>
      <p>
        If a part is dead, damaged or missing, see{' '}
        <a href="/returns">returns and refunds</a>. Faulty parts are replaced or refunded.
      </p>

      <h2>What we do not promise</h2>
      <p>
        We do not promise that your project will work. The kit is a starting point: what you
        build with it is your software, on your schedule, and we cannot warrant code we did not
        write.
      </p>
      <p>
        We do not cover damage you cause after delivery — wrong wiring, reversed polarity, a
        supply other than the one in the box, drops, or modification. The parts are standard
        and individually replaceable, so a mistake is rarely fatal; write to us and we will
        usually sell you the one part.
      </p>
      <p>
        Our liability is limited to what you paid for the kit. We are not liable for anything
        it was connected to or anything built on top of it.
      </p>

      <h2>Support</h2>
      <p>
        Email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>, answered by a person
        within two working days. Build questions are welcome — we would rather help you finish
        it than process a return.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the laws of India, and disputes fall to the courts of
        Bengaluru, Karnataka. Nothing here takes away rights you have under the Consumer
        Protection Act, 2019.
      </p>
    </LegalPage>
  )
}
