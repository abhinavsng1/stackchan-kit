import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { CONTACT } from '@/lib/kit'

export const metadata: Metadata = {
  title: 'Contact · Pebble Robo',
  description: 'How to reach Pebble Robo about a Pebble-chan kit or an order.',
  alternates: { canonical: '/contact' },
}

export default function Contact() {
  return (
    <LegalPage title="Contact" updated="25 September 2026">
      <div className="keyfact">
        <p>
          <strong><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></strong><br />
          One address, read by a person, answered within two working days.
        </p>
      </div>

      <h2>Who we are</h2>
      <p>
        {CONTACT.entity} is a small operation in Bengaluru, Karnataka, India, assembling and
        shipping the Pebble-chan build kit. There is no support queue and no phone tree:
        email reaches the people who pack the boxes.
      </p>

      <h2>What to include</h2>
      <p>
        If it is about an order, send the <strong>payment id</strong> from your order
        confirmation. It identifies the order exactly and saves a round trip.
      </p>
      <p>
        If it is about a part that is not behaving, a photo or a short video is worth more
        than a paragraph. Several reported faults turn out to be a connector seated the
        wrong way round, which is quicker to spot than to describe.
      </p>

      <h2>Before you write</h2>
      <p>
        The <a href="/#faq">questions people ask first</a> covers what is in the box, what
        you write the software in, whether it needs the internet, and when it ships. The{' '}
        <a href="/#specs">specifications</a> list every part by its real designation, so you
        can look a component up before asking us about it.
      </p>

      <h2>Policies</h2>
      <ul>
        <li><a href="/returns">Returns and refunds</a></li>
        <li><a href="/shipping">Shipping and delivery</a></li>
        <li><a href="/terms">Terms of sale</a></li>
        <li><a href="/privacy">Privacy</a></li>
      </ul>
    </LegalPage>
  )
}
