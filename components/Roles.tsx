import Image from 'next/image'
import { shippedRoles, plannedRoles } from '@/lib/roles'

/**
 * What people make it.
 *
 * This replaces a gallery of expressions. Twelve faces is a number, and a
 * number does not make anyone want a robot — what they want to know is what
 * it will be once it is on their desk.
 *
 * Every image here is a render and says so. The rule on this page is that a
 * generated picture is always labelled and never sits next to a caption
 * claiming real footage; the films and the hero carry that claim, and they
 * are the only things that may.
 */
export default function Roles() {
  const roles = shippedRoles()
  const planned = plannedRoles()

  return (
    <section id="roles" className="wrap-wide" style={{ paddingBlock: 'var(--section-y)' }}>
      <div className="max-w-[34ch] mb-12 md:mb-16">
        <p className="t-label m-0 mb-4">What it becomes</p>
        <h2 className="t-display m-0 mb-5" style={{ fontSize: 'var(--t-h2)' }}>
          One robot. Several jobs.
        </h2>
        <p className="m-0 text-[var(--muted)]"
           style={{ fontSize: 'var(--t-lead)', lineHeight: 'var(--lh-body)' }}>
          It arrives knowing how to be a pet. Everything after that is you
          deciding what else it should be.
        </p>
      </div>

      <ul className="grid gap-x-6 gap-y-12 list-none p-0 m-0 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role, i) => (
          <li
            key={role.id}
            /* The first card runs wide on desktop: it is the one that is true
               the moment the box is open, and the rest are what you do next. */
            className={i === 0 ? 'lg:col-span-2' : ''}
          >
            <div
              className="relative overflow-hidden mb-5"
              style={{
                borderRadius: 'var(--radius-tile)',
                border: '1px solid var(--line-soft)',
                background: 'var(--surface)',
                aspectRatio: i === 0 ? '2 / 1' : '4 / 3',
              }}
            >
              <Image
                src={`${role.image}@1600.webp`}
                alt={role.body}
                width={1600}
                height={1200}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="w-full h-full object-cover"
              />
              <span
                className="t-mono absolute right-3 bottom-3 px-2 py-1 text-[10px] uppercase"
                style={{
                  borderRadius: 999,
                  background: 'var(--ink)',
                  border: '1px solid var(--ink)',
                  color: 'var(--bg)',
                  letterSpacing: '.12em',
                }}
              >
                render
              </span>
            </div>

            <h3 className="m-0 mb-2" style={{ fontSize: 'var(--t-h3)', fontWeight: 700 }}>
              {role.title}
            </h3>
            <p className="m-0 max-w-[42ch] text-[var(--muted)]"
               style={{ fontSize: 'var(--t-small)', lineHeight: 1.55 }}>
              {role.body}
            </p>
          </li>
        ))}
      </ul>

      {planned.length > 0 && (
        <div className="mt-14 pt-8" style={{ borderTop: '1px solid var(--line-soft)' }}>
          <p className="t-label m-0 mb-4">Not yet — we are building these</p>
          <ul className="grid gap-x-6 gap-y-5 list-none p-0 m-0 sm:grid-cols-2 lg:grid-cols-3">
            {planned.map((role) => (
              <li key={role.id} className="max-w-[42ch]">
                <h3 className="m-0 mb-1.5 text-[var(--muted)]"
                    style={{ fontSize: '17px', fontWeight: 600 }}>
                  {role.title}
                </h3>
                <p className="m-0 text-[var(--muted-2)]"
                   style={{ fontSize: '14.5px', lineHeight: 1.55 }}>
                  {role.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
