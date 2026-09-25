import Link from 'next/link'
import { CONTACT } from '@/lib/kit'

/**
 * Shell for the policy pages.
 *
 * These exist to be read by three audiences with different needs: a buyer
 * deciding whether to trust us, a payment aggregator checking we publish
 * terms at all, and Google Merchant Center, which refuses accounts whose
 * return conditions are vague. All three are served by the same thing —
 * saying plainly what happens, in numbers where a number exists.
 */
export default function LegalPage({
  title, updated, children,
}: {
  title: string
  /** Shown because a policy with no date is a policy nobody can rely on. */
  updated: string
  children: React.ReactNode
}) {
  return (
    <main className="wrap" style={{ paddingBlock: '48px 96px' }}>
      <nav aria-label="Breadcrumb" className="t-mono text-[11.5px] text-[var(--muted)] mb-6">
        <Link href="/" className="text-[var(--muted)]">Pebble Robo</Link>
        <span className="opacity-50"> › </span>
        <span className="text-[var(--ink)]">{title}</span>
      </nav>

      <div className="max-w-[68ch]">
        <h1 className="t-display text-[clamp(28px,4.5vw,40px)] mt-0 mb-2">{title}</h1>
        <p className="t-label m-0 mb-10">Last updated {updated}</p>

        <div className="legal">{children}</div>

        <hr className="my-10" style={{ border: 0, borderTop: '1px solid var(--line)' }} />
        <p className="text-[14px] text-[var(--muted)] m-0">
          Questions about any of this? Write to{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and a person will answer.
        </p>
        <p className="mt-6 mb-0">
          <Link href="/" className="t-mono text-[13px]">← Back to the kit</Link>
        </p>
      </div>
    </main>
  )
}
