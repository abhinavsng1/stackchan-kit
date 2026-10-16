import Image from 'next/image'
import Film from '@/components/site/Film'
import { Reveal } from '@/components/site/motion'

/**
 * The real thing: photographs and a phone film of finished robots, no
 * renders. One compact row — a swipe rail on a phone, four across from md up —
 * so the page gets the evidence without getting much longer.
 *
 * The film plays with sound only when pressed (Film.tsx); the photographs
 * lazy-load, because this is well below the fold.
 */
export const REAL_PHOTOS = [
  { src: '/media/real/table-4347.jpg', alt: 'A white and a black PebbleRobo side by side on a patterned tablecloth', caption: 'Black and white' },
  { src: '/media/real/table-4352.jpg', alt: 'Two PebbleRobos on a dining table in the late-afternoon light', caption: 'On the dining table' },
  { src: '/media/real/table-4335.jpg', alt: 'Close up of the two robots, the white one turned towards the black one', caption: 'Up close' },
] as const

export default function RealThing({
  id = 'real', label = 'The real thing', title = 'No renders here.',
  lead = 'Two finished robots, one black and one white, on an ordinary table. And a video call from the phone app, checking in on the cat.',
}: { id?: string; label?: string; title?: string; lead?: string }) {
  return (
    <section id={id} className="section scroll-mt-16">
      <div className="wrap">
        <div className="grid lg:grid-cols-12 gap-x-10 gap-y-6 items-end mb-10 md:mb-14">
          <Reveal className="lg:col-span-7">
            <p className="t-label m-0 mb-6">{label}</p>
            <h2 className="t-display t-h2 m-0">{title}</h2>
          </Reveal>
          <Reveal className="lg:col-span-4 lg:col-start-9" delay={0.1}>
            <p className="t-lead m-0">{lead}</p>
          </Reveal>
        </div>

        <Reveal y={32}>
          <div className="rail real-row">
            <figure className="m-0">
              <div className="relative">
                <Film id={`${id}-call`} src="/media/real/film-call" title="A video call, from the app" length="0:29" aspect="3 / 4" />
                <span className="tag absolute left-4 top-4 pointer-events-none">Real footage</span>
              </div>
              <figcaption className="t-mono text-[11.5px] text-[var(--muted)] mt-3">Video call · shot on a phone</figcaption>
            </figure>
            {REAL_PHOTOS.map((p) => (
              <figure key={p.src} className="m-0">
                <div className="media" style={{ aspectRatio: '3 / 4' }}>
                  <Image src={p.src} alt={p.alt} fill sizes="(max-width: 768px) 82vw, 25vw"
                         className="object-cover" />
                  <span className="tag absolute left-4 top-4 pointer-events-none">Photo</span>
                </div>
                <figcaption className="t-mono text-[11.5px] text-[var(--muted)] mt-3">{p.caption}</figcaption>
              </figure>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
