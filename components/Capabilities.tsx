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
      <Tile className="sm:col-span-2">
        <Screen h="h-[170px] sm:h-[230px]">
          <svg viewBox="0 0 320 190" className="h-full w-auto" aria-hidden="true">
            <g className="eye-glance">
              <g className="anim eye-blink">
                <ellipse cx="122" cy="86" rx="26" ry="26" fill="var(--glow)" />
              </g>
              <g className="anim eye-blink" style={{ animationDelay: '.06s' }}>
                <ellipse cx="198" cy="86" rx="26" ry="26" fill="var(--glow)" />
              </g>
              <path d="M142 132 Q160 148 178 132" fill="none" stroke="var(--glow)"
                    strokeWidth="6" strokeLinecap="round" />
            </g>
          </svg>
          <span className="absolute left-4 top-4 t-pixel text-[9.5px]" style={{ color: 'rgba(255,255,255,.35)' }}>
            320 × 240
          </span>
        </Screen>
        <Caption title="It has a face"
                 line="Blinks, breathes and changes expression on its own."
                 chip="U1 · 2.0&quot; IPS display" />
      </Tile>

      {/* ---- 2. TURNS ---- */}
      <Tile>
        <div className="relative h-[170px] sm:h-[230px] grid place-items-center" style={{ background: 'var(--surface-2)' }}>
          <svg viewBox="0 0 200 180" className="h-full w-auto" aria-hidden="true">
            <path d="M 46 124 A 54 54 0 0 1 154 124" fill="none" stroke="var(--line)"
                  strokeWidth="2" strokeDasharray="4 5" />
            <text x="42" y="144" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--muted)">−150°</text>
            <text x="158" y="144" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--muted)">+150°</text>
            <g className="anim head-sweep" style={{ transformOrigin: '100px 124px' }}>
              <line x1="100" y1="124" x2="100" y2="84" stroke="var(--mint)" strokeWidth="3" strokeLinecap="round" />
              <rect x="84" y="62" width="32" height="24" rx="5" fill="var(--mint)" />
              <circle cx="93" cy="74" r="3" fill="var(--screen)" />
              <circle cx="107" cy="74" r="3" fill="var(--screen)" />
            </g>
            <circle cx="100" cy="124" r="9" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
            <circle cx="100" cy="124" r="2.6" fill="var(--ink)" />
          </svg>
        </div>
        <Caption title="It turns to look"
                 line="Pan and tilt, each reporting where it actually got to."
                 chip="M1 + M2 · SCS0009" tone="var(--mint)" />
      </Tile>

      {/* ---- 3. SEES ---- */}
      <Tile>
        <Screen>
          <svg viewBox="0 0 220 170" className="h-full w-auto" aria-hidden="true">
            {[[16, 16, 1, 1], [204, 16, -1, 1], [16, 154, 1, -1], [204, 154, -1, -1]].map(([x, y, sx, sy], i) => (
              <path key={i} d={`M ${x} ${(y as number) + 20 * (sy as number)} L ${x} ${y} L ${(x as number) + 20 * (sx as number)} ${y}`}
                    fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5" />
            ))}
            <g className="anim reticle">
              <rect x="78" y="52" width="64" height="64" rx="4" fill="none" stroke="var(--amber)" strokeWidth="2.5" />
              <circle cx="110" cy="84" r="3" fill="var(--amber)" />
              <text x="78" y="46" fontFamily="var(--font-mono)" fontSize="10" fill="var(--amber)">FACE 0.94</text>
            </g>
          </svg>
          <span className="absolute left-4 top-4 t-pixel text-[9.5px] flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,.35)' }}>
            <span className="dot" style={{ background: 'var(--amber)', boxShadow: 'none', width: 6, height: 6 }} />CAM
          </span>
        </Screen>
        <Caption title="It can see"
                 line="Onboard camera. Point the head at whoever is talking."
                 chip="U1 · GC0308" tone="var(--amber)" />
      </Tile>

      {/* ---- 4. TALKS + LISTENS ---- */}
      <Tile>
        <Screen>
          <svg viewBox="0 0 220 170" className="h-full w-auto" aria-hidden="true">
            {Array.from({ length: 13 }).map((_, i) => {
              const h = [22, 46, 70, 38, 92, 58, 104, 62, 86, 34, 66, 44, 24][i]
              return (
                <rect key={i} className="bar" x={22 + i * 14} y={85 - h / 2} width="7" height={h} rx="3.5"
                      fill={i % 2 ? 'var(--violet)' : 'var(--glow)'}
                      style={{ animationDelay: `${i * 0.085}s` }} />
              )
            })}
          </svg>
          <span className="absolute left-4 top-4 t-pixel text-[9.5px]" style={{ color: 'rgba(255,255,255,.35)' }}>IN · OUT</span>
        </Screen>
        <Caption title="It talks and listens"
                 line="A 1 W speaker and two mics. No extra module."
                 chip="U1 · AW88298 + ES7210" tone="var(--violet)" />
      </Tile>

      {/* ---- 5. ONLINE ---- */}
      <Tile>
        <div className="relative h-[150px] sm:h-[190px] grid place-items-center" style={{ background: 'var(--surface-2)' }}>
          <svg viewBox="0 0 220 170" className="h-full w-auto" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <path key={`base-${i}`}
                    d={`M ${110 - 26 - i * 24} ${112 - i * 2} A ${26 + i * 24} ${26 + i * 24} 0 0 1 ${110 + 26 + i * 24} ${112 - i * 2}`}
                    fill="none" stroke="var(--line)" strokeWidth="4" strokeLinecap="round" />
            ))}
            {[0, 1, 2].map((i) => (
              <path key={i} className="ping"
                    d={`M ${110 - 26 - i * 24} ${112 - i * 2} A ${26 + i * 24} ${26 + i * 24} 0 0 1 ${110 + 26 + i * 24} ${112 - i * 2}`}
                    fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round"
                    style={{ animationDelay: `${i * 0.42}s` }} />
            ))}
            <circle cx="110" cy="118" r="7" fill="var(--brand)" />
          </svg>
        </div>
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
