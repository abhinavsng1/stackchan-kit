# Partial COD — what is built, and what is still missing

Razorpay enabled COD on the account (ticket #21434798) and will enable partial
COD once we have implemented their integration note for native merchants. This
records what that note says, what is built against it, and the one thing it
does not tell us.

## What partial COD actually is

A ₹4,999 order with a ₹499 advance taken online and ₹4,500 collected at the
door. That is what this product has always sold; today's one-tap deposit fakes
it with a ₹499 cart, which hides the balance from Razorpay and from the buyer.

## How to recognise it

The tell is the **order status**, not the arithmetic:

| Shape | order.status | payment.status |
|---|---|---|
| Prepaid in full | `paid` or `placed` | `captured` |
| Cash on delivery | — | `pending` |
| **Partial COD** | **`attempted`** | **`captured`** |

`attempted` is deliberate: the order is left unfinished because money is still
owed. What a courier collects is `order.amount_due + cod_fee` — `order.amount`
does **not** include the COD fee.

Implemented in `readMagicPayment()` (lib/magic.ts), with tests in
tests/magic-checkout.test.ts. It is inert until Razorpay starts sending orders
in this shape, and our own `notes.plan` still wins where we wrote one, so both
shapes can be in flight at once.

## What is NOT built, and why

The note says that once those conditions are met we must:

> Create a new payment against the **same** order with
> Amount = `order.amount_due` + cod fee, Method = COD

**It does not say which endpoint creates that payment.** No path, no verb, no
payload. Guessing at a payments API that moves money is exactly the kind of
invention that cost us two sales already, so nothing is written against it.

Ask Razorpay for: the exact HTTP method and path to create a COD payment
against an existing order, its request body, and whether it is called by the
merchant server or raised by Razorpay itself.

## The other open questions

**How the ₹499 advance is configured.** The note shows a fetched order carrying
`offer_id`/`offers` but never the create request. It may be
`first_payment_min_amount` (the Orders API validates that field), it may be an
offer, or it may be set on their side when they enable the feature. It matters
whether it can be a **fixed ₹499 per unit** rather than a percentage: a
percentage of ₹4,999 is not the price this product advertises, and a percentage
of two robots is not ₹499 either.

**Whether the window names it plainly.** The buyer must see that choosing cash
on delivery charges ₹499 now and ₹4,500 later. If Razorpay's UI only says
"Cash on Delivery", somebody will expect to pay nothing today, and the first
they learn otherwise is a charge on their card.

## The design this unlocks: one button

Partial COD moves the choice off our page and into the window, where it
belongs. There is one order, always ₹4,999, with the real line items. Razorpay
shows its payment methods and COD sits among them:

- card, UPI, netbanking → ₹4,999 now, nothing at the door;
- cash on delivery → ₹499 taken as the advance, ₹4,500 collected on delivery.

So the page needs **one** button, not two, and no plan picker. The plans stop
being a thing a buyer decides on our page and become a thing they decide by
choosing how to pay — which is the one choice Razorpay's window actually
controls. Everything else about a one-tap order (colour, quantity) still has to
be settled before the window opens, because that part it cannot ask.

It is also more honest than what ships today. The buyer sees ₹4,999 with
₹4,500 due on delivery, instead of a ₹499 "booking" line that never mentions
the balance.

## When both answers arrive

1. Deposit orders are created at the full ₹4,999 with real line items, not a
   ₹499 "booking" line.
2. `MAGIC_COD=1`, and `shippingFor` may offer COD on a deposit order — the rail
   that forbids it today exists because a ₹499 cart plus COD means collecting
   ₹499 at the door and losing ₹4,500.
3. The webhook creates the COD payment for `amount_due + cod_fee`.
4. The buy panel collapses to one button, the sticky bar to one, and
   `lib/plans.ts` stops being asked which door a buyer took — the payment
   method answers that.

## Pricing

Magic Checkout is **0.5% on every transaction, prepaid and COD**, on top of the
ordinary gateway fee. ₹25 on a ₹4,999 sale. The form path does not carry it.
