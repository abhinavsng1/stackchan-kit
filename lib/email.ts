import type { PreorderRecord } from '@/lib/preorders'
import { CONTACT, PRICE } from '@/lib/kit'

/**
 * Confirmation mail for a new reservation.
 *
 * Two things this file refuses to do:
 *
 * 1. Throw. A reservation that is safely in Postgres must not be reported as a
 *    failure because a mail server had a bad minute. Every path returns a
 *    result the caller can log and ignore.
 * 2. Pick a provider for you. Whichever credentials are present wins, so the
 *    choice is an environment variable rather than a rewrite.
 */

export type SendResult =
  | { ok: true; provider: 'resend' | 'smtp'; id?: string }
  | { ok: false; provider: 'resend' | 'smtp' | 'none'; reason: string }

const FROM = `Pebble Robo <${CONTACT.email}>`

function provider(): 'resend' | 'smtp' | 'none' {
  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) return 'smtp'
  return 'none'
}

export function emailConfigured(): boolean {
  return provider() !== 'none'
}

/* ------------------------------- content ------------------------------- */

const firstName = (full: string) => full.trim().split(/\s+/)[0]

export function reservationSubject() {
  return 'Your Pebble-chan is reserved'
}

function deliveryDetails(r: PreorderRecord) {
  const rows: [string, string][] = [['Name', r.name]]
  if (r.address?.trim()) rows.push(['Address', r.address.trim()])
  const city = [r.city?.trim(), r.pincode?.trim()].filter(Boolean).join(' ')
  if (city) rows.push(['City / PIN', city])
  if (r.phone?.trim()) rows.push(['Phone', r.phone.trim()])
  const complete = [r.address, r.city, r.pincode, r.phone].every((v) => v?.trim())
  return {
    rows,
    heading: complete ? 'Where we will send it' : 'Delivery details',
    message: complete
      ? 'Please check these details. If anything is wrong, just reply to this email and we will correct it.'
      : 'We will email you to collect any remaining phone and shipping details before payment and shipping.',
  }
}

export function reservationText(r: PreorderRecord) {
  const delivery = deliveryDetails(r)
  return `Hi ${firstName(r.name)},

Your Pebble-chan kit is reserved. Nothing has been charged, and nothing will be
until we write to you again.

WHAT YOU RESERVED
  Pebble-chan build kit x ${r.qty}
  ${PRICE.now} each (was ${PRICE.mrp})
  Dispatch: 1-2 weeks

${delivery.heading.toUpperCase()}
${delivery.rows.map(([label, value]) => `  ${label}: ${value}`).join('\n')}

${delivery.message}

WHAT HAPPENS NEXT
  We confirm the batch and your delivery details, email you a payment link,
  and ship once it clears. You are under no obligation until you pay.

Questions, changes, second thoughts: reply to this message. A person reads it.

- Pebble Robo
  ${CONTACT.email}

Pebble-chan is based on the open-source Stack-chan project by Shinya Ishikawa
and contributors, used under the Apache License 2.0.`
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function reservationHtml(r: PreorderRecord) {
  const delivery = deliveryDetails(r)
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#5a6672;font-size:13px;white-space:nowrap">${esc(k)}</td>` +
    `<td style="padding:6px 0;color:#0b0f14;font-size:14px">${esc(v)}</td></tr>`

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0b0f14">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e7ec;border-radius:14px;padding:28px">

  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5a6672">Reserved</p>
  <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">You're on the list, ${esc(firstName(r.name))}.</h1>

  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3d4752">
    Your Pebble-chan kit is reserved. Nothing has been charged, and nothing will be
    until we write to you again.
  </p>

  <div style="border:1px solid #e2e7ec;border-radius:10px;padding:16px 18px;margin-bottom:18px">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5a6672">What you reserved</p>
    <table style="border-collapse:collapse;width:100%">
      ${row('Kit', `Pebble-chan build kit x ${r.qty}`)}
      ${row('Price', `${PRICE.now} each (was ${PRICE.mrp})`)}
      ${row('Dispatch', '1-2 weeks')}
    </table>
  </div>

  <div style="border:1px solid #e2e7ec;border-radius:10px;padding:16px 18px;margin-bottom:18px">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5a6672">${delivery.heading}</p>
    <table style="border-collapse:collapse;width:100%">
      ${delivery.rows.map(([label, value]) => row(label, value)).join('\n      ')}
    </table>
    <p style="margin:12px 0 0;font-size:13px;color:#5a6672">
      ${delivery.message}
    </p>
  </div>

  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3d4752">
    <strong style="color:#0b0f14">What happens next.</strong> We confirm the batch and your
    delivery details, email you a payment link, and ship once it clears. You are under
    no obligation until you pay.
  </p>

  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3d4752">
    Questions, changes, second thoughts — reply to this message. A person reads it.
  </p>

  <hr style="border:0;border-top:1px solid #e2e7ec;margin:0 0 16px">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#5a6672">
    Pebble Robo &middot; <a href="mailto:${CONTACT.email}" style="color:#2f6bff">${CONTACT.email}</a><br>
    Pebble-chan is based on the open-source
    <a href="https://github.com/meganetaaan/stack-chan" style="color:#5a6672">Stack-chan</a>
    project by Shinya Ishikawa and contributors, used under the Apache License 2.0.
  </p>
</div>
</body></html>`
}

/* -------------------------------- sending ------------------------------- */

export async function sendReservationEmail(r: PreorderRecord): Promise<SendResult> {
  const which = provider()
  if (which === 'none') {
    return { ok: false, provider: 'none', reason: 'no email provider configured' }
  }

  const payload = {
    to: r.email,
    subject: reservationSubject(),
    text: reservationText(r),
    html: reservationHtml(r),
  }

  try {
    if (which === 'resend') {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { data, error } = await resend.emails.send({
        from: FROM,
        replyTo: CONTACT.email,
        ...payload,
      })
      if (error) return { ok: false, provider: 'resend', reason: error.message }
      return { ok: true, provider: 'resend', id: data?.id }
    }

    const nodemailer = (await import('nodemailer')).default
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtpout.secureserver.net',
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    })
    const info = await transport.sendMail({ from: FROM, replyTo: CONTACT.email, ...payload })
    return { ok: true, provider: 'smtp', id: info.messageId }
  } catch (e) {
    return { ok: false, provider: which, reason: e instanceof Error ? e.message : String(e) }
  }
}
