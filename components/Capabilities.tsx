import Clip from '@/components/Clip'
/**
 * What the kit does — demonstrated, not described.
 *
 * Every tile animates the capability it claims, and every tile cites the
 * component that provides it. Copy is deliberately short: the picture carries
 * the meaning, the chip carries the proof.
 */

function Chip({ children, tone = 'var(--brand)' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className="t-mono text-[11px] px-2.5 py-1 rounded-md whitespace-nowrap"
          style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}>
      {children}
    </span>
  )
}

function Tile({
  className = '', dark, children,
}: { className?: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <article
      className={`card card-lift overflow-hidden flex flex-col ${className}`}
      style={dark ? { background: 'var(--screen)', borderColor: 'transparent' } : undefined}
    >
      {children}
    </article>
  )
}

function Caption({
  title, line, chip, tone, light,
}: { title: string; line: string; chip: string; tone?: string; light?: boolean }) {
  return (
    <div className="p-5 pt-4 mt-auto">
      <h3 className="t-display text-[20px] m-0" style={light ? { color: '#fff' } : undefined}>{title}</h3>
      <p className="text-[14px] mt-1.5 mb-3.5" style={{ color: light ? 'rgba(255,255,255,.62)' : 'var(--muted)' }}>
        {line}
      </p>
      <Chip tone={tone}>{chip}</Chip>
    </div>
  )
}

/** Shared display surface for the tiles that render on-screen content. */
function Screen({ children, h = 'h-[150px] sm:h-[190px]' }: { children: React.ReactNode; h?: string }) {
  return (
    <div className={`relative ${h} grid place-items-center`} style={{ background: 'var(--screen)' }}>
      {children}
    </div>
  )
}

export default function Capabilities() {
  return (
    <>
    <div className="rail">

      {/* ---- 1. FACE — the big one ---- */}
      <Tile>
        <Clip src="/media/clips/face" poster="/media/clips/face.webp"
              alt="The face on the screen blinking and changing expression"
              className="h-[150px] sm:h-[190px]" sound />
        <Caption title="It has a face"
                 line="Blinks, breathes and changes expression on its own."
                 chip="U1 · 2.0&quot; IPS display" />
      </Tile>

      {/* ---- 2. TURNS ---- */}
      <Tile>
        <Clip src="/media/clips/move" poster="/media/clips/move.webp"
              alt="The head panning to the side and tilting upward"
              className="h-[150px] sm:h-[190px]" />
        <Caption title="It turns to look"
                 line="Pan and tilt, each reporting where it actually got to."
                 chip="M1 + M2 · SCS0009" tone="var(--mint)" />
      </Tile>

      {/* ---- 3. SEES ---- */}
      <Tile>
        <Clip src="/media/clips/see" poster="/media/clips/see.webp"
              alt="The head turning to follow a hand moving across the desk"
              className="h-[150px] sm:h-[190px]" />
        <Caption title="It can see"
                 line="Onboard camera. Point the head at whoever is talking."
                 chip="U1 · GC0308" tone="var(--amber)" />
      </Tile>

      {/* ---- 4. TALKS + LISTENS ---- */}
      <Tile>
        <Clip src="/media/clips/talk" poster="/media/clips/talk.webp"
              alt="The mouth animating in speech with audio levels on the screen"
              className="h-[150px] sm:h-[190px]" />
        <Caption title="It talks and listens"
                 line="A 1 W speaker and two mics. No extra module."
                 chip="U1 · AW88298 + ES7210" tone="var(--violet)" />
      </Tile>

      {/* ---- 5. TOUCH ---- */}
      <Tile>
        <Clip src="/media/clips/touch" poster="/media/clips/touch.webp"
              alt="A fingertip tapping the screen and the interface responding"
              className="h-[150px] sm:h-[190px]" />
        <Caption title="You can touch it"
                 line="Capacitive glass. The face doubles as the interface."
                 chip="U1 · FT6336U" tone="var(--amber)" />
      </Tile>

      {/* ---- 6. ONLINE ---- */}
      <Tile>
        <Clip src="/media/clips/net" poster="/media/clips/net.webp"
              alt="The screen showing a Wi-Fi signal connecting"
              className="h-[150px] sm:h-[190px]" />
        <Caption title="It gets online"
                 line="Wi-Fi and Bluetooth. Wire it to whichever API you like."
                 chip="U1 · ESP32-S3" />
      </Tile>

    </div>

    {/* ---- 6. OPEN SOURCE — full-width band, never a rail slide ---- */}
    <div className="mt-5">
      <Tile dark>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center p-6 md:p-8">
          <div>
            <h3 className="t-display text-[clamp(24px,3.4vw,34px)] m-0" style={{ color: '#fff' }}>
              You rewrite all of it
            </h3>
            <p className="text-[15px] mt-3 mb-5 max-w-[40ch]" style={{ color: 'rgba(255,255,255,.62)' }}>
              JavaScript on the Moddable SDK. The controller is a stock CoreS3, so
              Arduino and M5Unified work too. Clone it and go.
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip tone="var(--glow)">Apache-2.0</Chip>
              <Chip tone="var(--glow)">JavaScript</Chip>
              <Chip tone="var(--glow)">Arduino / C++</Chip>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
            <div className="flex items-center gap-1.5 px-3.5 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,.1)' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <pre className="t-mono text-[12px] leading-[1.9] m-0 px-4 py-3.5 overflow-x-auto"
                 style={{ color: 'rgba(255,255,255,.85)' }}>
<span style={{ color: 'var(--glow)' }}>$</span> git clone https://github.com/{'\n'}      meganetaaan/stack-chan.git
{'\n'}<span style={{ color: 'var(--glow)' }}>$</span> cd stack-chan && npm i
{'\n'}<span style={{ color: 'var(--glow)' }}>$</span> npm run setup -- <span style={{ color: 'var(--amber)' }}>--device=esp32</span>
{'\n'}<span style={{ color: 'var(--glow)' }}>$</span> npm run flash
{'\n'}<span style={{ color: 'rgba(255,255,255,.4)' }}># the face comes up.</span><span className="caret"> ▋</span>
            </pre>
          </div>
        </div>
      </Tile>
    </div>
    </>
  )
}
