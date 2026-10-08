import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { CONTACT, PRICE } from '@/lib/kit'

export const metadata: Metadata = {
  title: 'Returns and refunds · Pebble Robo',
  description:
    'PebbleRobo returns: 7 days from delivery for a robot or kit that does not work. ' +
    'Refunds within 7 working days of the item reaching us.',
  alternates: { canonical: '/returns' },
}

export default function Returns() {
  return (
    <LegalPage title="Returns and refunds" updated="7 October 2026">
      <div className="keyfact">
        <p><strong>7 days</strong> from delivery to raise a return, for a robot or kit that does not work.</p>
        <p><strong>Return postage is paid by you.</strong> Refunds are issued within{' '}
          <strong>7 working days</strong> of it reaching us.</p>
      </div>

      <h2>What we accept back</h2>
      <p>
        We accept returns for <strong>a robot or kit that does not work</strong> — a part
        that is dead on arrival, damaged in transit, missing from the box, or that fails
        in normal use or during a normal build.
      </p>
      <p>
        We do not accept returns because you changed your mind. Once a box is opened the
        robot or its parts have been handled, and we cannot sell them to somebody else as
        new. We would rather say that plainly here
        than write a policy we quietly decline to honour.
      </p>

      <h2>Condition</h2>
      <p>It must come back <strong>undamaged</strong>, apart from the fault you are reporting.</p>
      <ul>
        <li>No physical damage caused after delivery — drops, bent pins, crushed housings.</li>
        <li>No damage from wrong wiring, reversed polarity, or a supply other than the one in the box.</li>
        <li>Nothing cut, soldered, filed or glued. Neither the robot nor the kit needs any of that.</li>
        <li>All parts present, including fasteners and the printed shell.</li>
      </ul>
      <p>
        Cosmetic marks from ordinary use or an ordinary build are fine. We are looking for whether the
        part failed, not whether the box was opened carefully.
      </p>

      <h2>How to start a return</h2>
      <ol>
        <li>
          Write to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> within{' '}
          <strong>7 days of delivery</strong>, with your order email and payment id — both
          are on your order confirmation.
        </li>
        <li>
          Tell us what is not working. A photo or a short video helps and often saves the
          return entirely: several faults turn out to be a connector seated the wrong way
          round, which we can talk you through in a reply.
        </li>
        <li>We answer within two working days with a return address.</li>
        <li>Post it back. <strong>You pay the return postage.</strong> Keep the tracking number.</li>
      </ol>

      <h2>Refunds</h2>
      <p>
        Once it reaches us we check the reported fault. If it holds up, we refund{' '}
        <strong>within 7 working days</strong> to the same method you paid with — the card,
        UPI account or bank account used at checkout. We cannot refund to a different
        destination; that is a restriction of the payment system, not a preference.
      </p>
      <p>
        The {PRICE.now} you paid is refunded in full. The postage you paid to send it back
        is not refunded, and neither is the original delivery, which has already been used.
      </p>
      <p>
        If the fault does not hold up — the part works here, or the damage is post-delivery —
        we will tell you what we found and send it back to you at our cost. We will not
        keep both your PebbleRobo and your money.
      </p>

      <h2>Replacements instead</h2>
      <p>
        For a single dead component, a replacement part is usually faster than returning the
        whole thing, and we will offer that first. Say if you would rather have the refund.
      </p>

      <h2>Cancelling before dispatch</h2>
      <p>
        Orders can be cancelled for a full refund at any time before it ships. Write to{' '}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. Once it has shipped, the
        return terms above apply.
      </p>
    </LegalPage>
  )
}
