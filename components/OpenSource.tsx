import CodeWindow from '@/components/CodeWindow'
/**
 * The open-source band.
 *
 * This used to be the tail of a six-tile capability grid. The grid is gone:
 * it claimed the same six things the playground now lets you operate, in
 * 150px cards, using four accent colours the design system does not have.
 * What was worth keeping is the part no interactive demo can show — that the
 * firmware is someone else's Apache-2.0 code and you are expected to replace
 * it.
 */
export default function OpenSource() {
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-12 items-center
                    p-6 sm:p-10 lg:p-14 on-dark"
         style={{ background: 'var(--pebble-ink)', borderRadius: 'var(--radius-tile)' }}>
      <div>
        <p className="t-label m-0 mb-4" style={{ color: 'var(--dark-muted)' }}>
          The software
        </p>
        <h2 className="t-display m-0 mb-4"
            style={{ fontSize: 'clamp(30px,4.6vw,52px)', lineHeight: 1.02, color: 'var(--pebble-white)' }}>
          Open it up when you are ready.
        </h2>
        <p className="text-[16px] leading-[26px] m-0 mb-7 max-w-[42ch]"
           style={{ color: 'var(--muted)' }}>
          It runs Stack-chan the day it arrives. Underneath, the behaviour is
          JavaScript on the Moddable SDK, and the controller is a stock CoreS3,
          so Arduino and M5Unified work too. Nothing here is ours to lock.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Apache-2.0', 'JavaScript', 'Arduino / C++'].map((t) => (
            <span key={t} className="t-mono text-[11px] px-2.5 py-1.5"
                  style={{
                    borderRadius: 999,
                    border: '1px solid var(--line)',
                    color: 'rgba(243,241,237,.78)',
                  }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <CodeWindow />
    </div>
  )
}
