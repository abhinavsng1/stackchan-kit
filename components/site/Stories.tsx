import Image from 'next/image'
import Clip from '@/components/Clip'
import { Reveal, Stagger, StaggerItem } from '@/components/site/motion'
import type { visibleProof, ProofItem } from '@/lib/proof'

/**
 * People living with it: one quote set large, then a wall of photos, clips and
 * short quotes, then where to find everyone.
 *
 * Takes what `visibleProof()` allows, so in production a placeholder never
 * reaches this component. When placeholders are showing (locally, on
 * previews) the section says so in plain words at the top.
 */
export default function Stories({ proof }: { proof: ReturnType<typeof visibleProof> }) {
  if (!proof.hasStories) return null
  const { featured, wall, socials, community, showingPlaceholders } = proof

  return (
    <section id="stories" className="section scroll-mt-16">
      <div className="wrap">
        {showingPlaceholders && (
          <p role="note" className="t-mono text-[12px] m-0 mb-10 px-3 py-2 w-fit rounded"
             style={{ background: 'var(--ember-wash)', color: 'var(--accent-ink)' }}>
            Placeholder content for layout review. Hidden on the live site until real stories arrive.
          </p>
        )}

        <p className="t-label m-0 mb-8">Stories</p>

        {featured && (
          <Reveal>
            <figure className="m-0">
              <blockquote className="t-display t-h2 m-0 max-w-[18ch]">
                <span className="accent">“</span>{featured.text}<span className="accent">”</span>
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-3 text-[15px]">
                <span className="inline-block w-8 h-px" style={{ background: 'var(--ink)' }} aria-hidden="true" />
                <span className="font-medium">{featured.name}</span>
                <span className="text-[var(--muted)]">{featured.meta}</span>
              </figcaption>
            </figure>
          </Reveal>
        )}

        {wall.length > 0 && (
          <Stagger className="wall rail mt-20 md:mt-28 sm:columns-2 lg:columns-3 gap-5 sm:[&>*]:mb-5 [&>*]:break-inside-avoid">
            {wall.map((item) => (
              <StaggerItem key={item.id}><Tile item={item} /></StaggerItem>
            ))}
          </Stagger>
        )}

        <Reveal>
          <div className="mt-20 md:mt-28 grid lg:grid-cols-12 gap-x-10 gap-y-8 items-end border-t pt-10"
               style={{ borderColor: 'var(--line)' }}>
            <div className="lg:col-span-6">
              <h3 className="t-display m-0" style={{ fontSize: 'clamp(32px, 3.6vw, 54px)' }}>
                Join the people who have one.
              </h3>
              <p className="t-lead mt-5 mb-0 max-w-[40ch]">
                Share what yours gets up to, borrow someone else’s idea, or
                teach it something new.
              </p>
            </div>
            <ul className="lg:col-span-5 lg:col-start-8 list-none p-0 m-0 grid">
              {[...socials, ...community].map((s) => (
                <li key={s.id} className="border-t first:border-t-0" style={{ borderColor: 'var(--line)' }}>
                  <a href={s.href} target="_blank" rel="noreferrer noopener"
                     className="group flex items-center justify-between py-4 text-[17px] no-underline text-[var(--ink)]">
                    <span>{s.label}</span>
                    <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Tile({ item }: { item: ProofItem }) {
  if (item.kind === 'quote') {
    return (
      <figure className="card m-0 p-7 md:p-8 transition-transform duration-500 hover:-translate-y-1"
              style={{ transitionTimingFunction: 'var(--ease)' }}>
        <blockquote className="m-0 text-[21px] leading-[1.35] tracking-[-0.02em] font-medium">
          “{item.text}”
        </blockquote>
        <figcaption className="mt-6 text-[14px]">
          <span className="font-medium">{item.name}</span>
          <span className="text-[var(--muted)]"> · {item.meta}</span>
        </figcaption>
      </figure>
    )
  }

  const aspect = item.shape === 'tall' ? '4 / 5' : item.shape === 'wide' ? '16 / 10' : '1 / 1'
  return (
    <figure className="m-0 group">
      <div className="media" style={{ aspectRatio: aspect, background: 'var(--surface-2)' }}>
        {!item.src ? (
          <div className="absolute inset-0 grid place-items-center border border-dashed rounded-[inherit]"
               style={{ borderColor: 'var(--line)' }}>
            <span className="t-mono text-[12px] text-[var(--muted)]">
              Customer {item.kind === 'video' ? 'video' : 'photo'}
            </span>
          </div>
        ) : item.kind === 'photo' ? (
          <Image src={item.src} alt={item.alt} fill sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 440px"
                 className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                 style={{ transitionTimingFunction: 'var(--ease)' }} />
        ) : (
          <Clip src={item.src} poster={item.poster ?? `${item.src}.webp`} alt={item.alt} className="absolute inset-0" />
        )}
      </div>
      <figcaption className="mt-3 flex justify-between gap-4 text-[14px]">
        <span>{item.caption}</span>
        <span className="t-mono text-[12px] text-[var(--muted)] shrink-0">{item.credit}</span>
      </figcaption>
    </figure>
  )
}
