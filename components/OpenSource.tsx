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
        <p className="t-label m-0 mb-4" style={{ color: 'rgba(243,241,237,.55)' }}>
          The software
        </p>
        <h2 className="t-display m-0 mb-4"
            style={{ fontSize: 'clamp(30px,4.6vw,52px)', lineHeight: 1.02, color: 'var(--pebble-white)' }}>
          You rewrite all of it.
        </h2>
        <p className="text-[16px] leading-[26px] m-0 mb-7 max-w-[42ch]"
           style={{ color: 'rgba(243,241,237,.66)' }}>
          JavaScript on the Moddable SDK. The controller is a stock CoreS3, so
          Arduino and M5Unified work too. Nothing here is ours to lock.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Apache-2.0', 'JavaScript', 'Arduino / C++'].map((t) => (
            <span key={t} className="t-mono text-[11px] px-2.5 py-1.5"
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(243,241,237,.22)',
                    color: 'rgba(243,241,237,.78)',
                  }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden"
           style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}>
        <div className="flex items-center gap-1.5 px-3.5 py-2.5"
             style={{ borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,.22)' }} />
          ))}
          <span className="t-mono text-[10.5px] ml-2" style={{ color: 'rgba(255,255,255,.35)' }}>
            zsh
          </span>
        </div>
        <pre className="t-mono text-[12px] leading-[2] m-0 px-4 py-4 overflow-x-auto"
             style={{ color: 'rgba(255,255,255,.86)' }}>
<span style={{ color: 'rgba(255,255,255,.38)' }}>$</span> git clone https://github.com/{'\n'}      meganetaaan/stack-chan.git
{'\n'}<span style={{ color: 'rgba(255,255,255,.38)' }}>$</span> cd stack-chan && npm i
{'\n'}<span style={{ color: 'rgba(255,255,255,.38)' }}>$</span> npm run setup -- --device=esp32
{'\n'}<span style={{ color: 'rgba(255,255,255,.38)' }}>$</span> npm run flash
{'\n'}<span style={{ color: 'rgba(255,255,255,.34)' }}># the face comes up.</span><span className="caret"> ▋</span>
        </pre>
      </div>
    </div>
  )
}
