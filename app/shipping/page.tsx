import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { CONTACT, PRICE } from '@/lib/kit'

export const metadata: Metadata = {
  title: 'Shipping and delivery · Pebble Robo',
  description:
    'Pebble-chan ships anywhere in India, free, within 1–2 weeks of the batch closing.',
  alternates: { canonical: '/shipping' },
}

export default function Shipping() {
  return (
    <LegalPage title="Shipping and delivery" updated="25 September 2026">
      <div className="keyfact">
        <p><strong>Delivery is free.</strong> The {PRICE.now} on the page is what you pay.</p>
        <p><strong>{PRICE.ship}</strong>, anywhere in India. We do not ship outside India.</p>
      </div>

      <h2>Where we ship</h2>
      <p>
        Anywhere in India, to any address the courier serves. We do not ship
        internationally — the kit is priced and supported for India only, and we would
        rather not take an order we cannot support.
      </p>

      <h2>What it costs</h2>
      <p>
        Nothing. Delivery is included in the kit price, and there is no separate charge at
        checkout for any address in India. No cash-on-delivery: the kit is paid for on the
        page before it is boxed.
      </p>

      <h2>When it arrives</h2>
      <p>
        Kits are built in batches. Yours is assembled after its batch closes and dispatched{' '}
        <strong>within 1–2 weeks</strong> of that. Transit is then typically two to four
        days to a metro and up to a week elsewhere.
      </p>
      <p>
        We email you when it leaves, with the courier and a tracking number. If a batch is
        going to run late, we email you before the window passes rather than after. You will
        not have to ask.
      </p>

      <h2>The address you give us</h2>
      <p>
        Your order confirmation prints the address back to you. Check it when it arrives —
        if anything is wrong, reply to that email the same day and we will correct it before
        the box is sealed. Once a kit has shipped, the address cannot be changed and a
        redelivery is between you and the courier.
      </p>

      <h2>If it does not arrive</h2>
      <p>
        If tracking has not moved for five working days, or the courier has marked it
        delivered and you do not have it, write to{' '}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> with your payment id. We
        will chase the courier. If a kit is genuinely lost in transit we send another one at
        our cost — a parcel we handed to a courier is our problem, not yours.
      </p>

      <h2>Damaged on arrival</h2>
      <p>
        Photograph the box before you unpack it if it looks crushed, then see{' '}
        <a href="/returns">returns and refunds</a>. Transit damage is covered.
      </p>
    </LegalPage>
  )
}
