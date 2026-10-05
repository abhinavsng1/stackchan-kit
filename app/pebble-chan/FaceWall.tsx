import { FACES, faceSvg } from '@/lib/faces'

/**
 * The twelve faces, drawn from the atlas the firmware itself uses.
 *
 * Not illustrations of the expressions — the expressions themselves, drawn
 * from the same source the device reads. A page about a robot with a face can
 * either describe the face or show it, and only one of those is something a
 * buyer can hold the delivered robot up against.
 *
 * Labelled by name rather than by the command that triggers them: whoever is
 * reading this wants a robot, not an API.
 *
 * On a dark ground because that is where they live. Everything else on this
 * page sits on paper; this band is the inside of the screen.
 */
export default function FaceWall() {
  return (
    <section className="py-16 md:py-24" style={{ background: 'var(--pebble-ink)' }}>
      <div className="wrap-wide">
        <div className="max-w-[46ch] mb-10 md:mb-14">
          <h2 className="t-display mt-0 mb-4"
              style={{ fontSize: 'clamp(30px,3.4vw,48px)', lineHeight: 1.03, color: 'var(--pebble-white)' }}>
            Twelve ways of looking at you.
          </h2>
          <p className="text-[16px] leading-[26px] m-0" style={{ color: 'rgba(243,241,237,.7)' }}>
            It changes its mind through the day without being asked. Pleased when you
            sit down, sleepy late on, doubtful when you say something odd.
          </p>
        </div>

        <ul className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 list-none p-0 m-0">
          {FACES.map((f) => (
            <li key={f.id}>
              <div
                className="overflow-hidden"
                style={{ borderRadius: 14, border: '1px solid rgba(243,241,237,.14)', aspectRatio: '4 / 3' }}
                /* The atlas emits a complete, self-contained <svg>. */
                dangerouslySetInnerHTML={{ __html: faceSvg(f) }}
              />
              <p className="text-[13px] mt-2.5 mb-0" style={{ color: 'rgba(243,241,237,.6)' }}>
                {f.name}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
