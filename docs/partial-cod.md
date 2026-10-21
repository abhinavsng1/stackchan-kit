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

## The other open question

How the ₹499 advance is configured on the order. The note shows a fetched order
carrying `offer_id`/`offers` but never shows the create request. It may be
`first_payment_min_amount` (the Orders API validates that field), it may be an
offer, or it may be set on their side when they enable the feature. Confirm
before changing order creation.

## When both answers arrive

1. Deposit orders are created at the full ₹4,999 with real line items, not a
   ₹499 "booking" line.
2. `MAGIC_COD=1`, and `shippingFor` may offer COD on a deposit order — the rail
   that forbids it today exists because a ₹499 cart plus COD means collecting
   ₹499 at the door and losing ₹4,500.
3. The webhook creates the COD payment for `amount_due + cod_fee`.

## Pricing

Magic Checkout is **0.5% on every transaction, prepaid and COD**, on top of the
ordinary gateway fee. ₹25 on a ₹4,999 sale. The form path does not carry it.
