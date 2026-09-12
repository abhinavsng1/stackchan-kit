/**
 * Authored technical drawings. No photography anywhere on this site — the
 * illustration is line work, which is what this audience reads anyway.
 */

const L = { stroke: 'var(--ink)', strokeWidth: 1.6, fill: 'none' } as const
const THIN = { stroke: 'var(--line)', strokeWidth: 1, fill: 'none' } as const

/** G1 — exploded assembly stack with leader lines to designators. */
export function ExplodedStack() {
  const items: [number, string, string][] = [
    [30, 'U1', 'CoreS3 Lite'],
    [96, 'H1', 'Shell + brackets'],
    [150, 'M2', 'Tilt servo'],
    [204, 'M1', 'Pan servo'],
    [258, 'A1', 'Driver board'],
  ]
  return (
    <svg viewBox="0 0 420 320" className="w-full h-auto" role="img"
         aria-label="Exploded view of the kit: controller, shell, tilt servo, pan servo and driver board stacked on one assembly axis">
      {/* assembly axis */}
      <line x1="120" y1="14" x2="120" y2="306" stroke="var(--line)" strokeWidth="1" strokeDasharray="7 5" />

      {/* U1 — controller cube */}
      <rect x="76" y="12" width="88" height="58" rx="5" {...L} fill="var(--surface-2)" />
      <rect x="86" y="21" width="68" height="40" rx="2" fill="var(--screen)" />
      <circle cx="108" cy="38" r="5" fill="var(--glow)" />
      <circle cx="132" cy="38" r="5" fill="var(--glow)" />

      {/* H1 — shell */}
      <path d="M80 112 L80 88 Q80 82 87 82 L153 82 Q160 82 160 88 L160 112" {...L} fill="var(--surface-2)" />
      <path d="M72 112 L168 112" {...L} />

      {/* M2 — tilt servo */}
      <rect x="88" y="132" width="64" height="34" rx="2" {...L} fill="var(--surface-2)" />
      <circle cx="120" cy="149" r="10" {...L} />
      <line x1="120" y1="149" x2="120" y2="141" {...L} />

      {/* M1 — pan servo */}
      <rect x="88" y="186" width="64" height="34" rx="2" {...L} fill="var(--surface-2)" />
      <circle cx="120" cy="203" r="10" {...L} />
      <line x1="120" y1="203" x2="128" y2="203" {...L} />

      {/* A1 — driver board with headers */}
      <rect x="70" y="242" width="100" height="40" rx="2" {...L} fill="var(--surface-2)" />
      <g {...THIN}>
        <line x1="80" y1="252" x2="80" y2="272" />
        <line x1="88" y1="252" x2="88" y2="272" />
        <line x1="96" y1="252" x2="96" y2="272" />
      </g>
      <rect x="130" y="252" width="30" height="20" rx="1" {...THIN} />

      {/* leader lines + designators */}
      {items.map(([y, d, label]) => (
        <g key={d}>
          <line x1="176" y1={y} x2="248" y2={y} stroke="var(--line)" strokeWidth="1" />
          <circle cx="176" cy={y} r="2.4" fill="var(--ink)" />
          <text x="256" y={y - 3} fontFamily="var(--font-mono)" fontSize="11.5"
                fontWeight="600" fill="var(--ink)" letterSpacing="0.06em">{d}</text>
          <text x="256" y={y + 11} fontFamily="var(--font-mono)" fontSize="10.5"
                fill="var(--muted)">{label}</text>
        </g>
      ))}
    </svg>
  )
}

/** G3 — servo travel. The arc spans 300° because the SCS0009 does. */
export function ServoSweep() {
  const cx = 150, cy = 150, r = 104
  // 300° of travel, centred on straight up: −150° … +150°
  const pt = (deg: number, radius = r) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)]
  }
  const [sx, sy] = pt(-150)
  const [ex, ey] = pt(150)

  return (
    <svg viewBox="0 0 300 300" className="w-full h-auto" role="img"
         aria-label="Servo travel diagram: 300 degrees of rotation from minus 150 to plus 150 degrees">
      {/* dead band — the 60° the servo cannot reach */}
      <path d={`M ${ex} ${ey} A ${r} ${r} 0 0 1 ${sx} ${sy}`}
            stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
      {/* live travel */}
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`}
            stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />

      {[-150, -90, -45, 0, 45, 90, 150].map((deg) => {
        const [x1, y1] = pt(deg, r - 9)
        const [x2, y2] = pt(deg, r)
        const [tx, ty] = pt(deg, r + 21)
        return (
          <g key={deg}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink)" strokeWidth="1.3" />
            <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                  fontFamily="var(--font-mono)" fontSize="10" fill="var(--muted)">
              {deg > 0 ? `+${deg}` : deg}°
            </text>
          </g>
        )
      })}

      {/* hub + sweeping pointer */}
      <circle cx={cx} cy={cy} r="17" {...L} fill="var(--surface-2)" />
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'sweep 7s ease-in-out infinite alternate' }}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - r + 16} stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx={cx} cy={cy - r + 16} r="4" fill="var(--ink)" />
      </g>
      <circle cx={cx} cy={cy} r="3.4" fill="var(--ink)" />

      <style>{`
        @keyframes sweep { from { transform: rotate(-150deg); } to { transform: rotate(150deg); } }
        @media (prefers-reduced-motion: reduce) { @keyframes sweep { from { transform: rotate(0); } to { transform: rotate(0); } } }
      `}</style>
    </svg>
  )
}

/** G4 — how a command actually reaches a servo. */
export function SignalFlow() {
  const box = (x: number, y: number, w: number, h: number, d: string, label: string) => (
    <g key={d}>
      <rect x={x} y={y} width={w} height={h} rx="2" {...L} fill="var(--surface-2)" />
      <text x={x + w / 2} y={y + h / 2 - 5} textAnchor="middle" fontFamily="var(--font-mono)"
            fontSize="11.5" fontWeight="600" fill="var(--ink)">{d}</text>
      <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fontFamily="var(--font-mono)"
            fontSize="9.5" fill="var(--muted)">{label}</text>
    </g>
  )
  const arrow = (x1: number, x2: number, y: number, key: string) => (
    <g key={key}>
      <line x1={x1} y1={y} x2={x2 - 6} y2={y} stroke="var(--ink)" strokeWidth="1.4" />
      <path d={`M ${x2 - 7} ${y - 4} L ${x2} ${y} L ${x2 - 7} ${y + 4}`} fill="var(--ink)" />
    </g>
  )

  return (
    <svg viewBox="0 0 640 210" className="w-full h-auto" role="img"
         aria-label="Signal flow: laptop over USB to the FE-URT-1 programmer, onto the RS485 bus, through the driver board, to both servos. The power supply feeds the driver board rail.">
      {box(8, 62, 92, 46, 'USB', 'your laptop')}
      {arrow(100, 136, 85, 'a1')}
      {box(136, 62, 92, 46, 'J1', 'FE-URT-1')}
      {arrow(228, 264, 85, 'a2')}
      {box(264, 62, 108, 46, 'A1', 'driver board')}

      {/* RS485 bus splitting to both servos */}
      <line x1="372" y1="85" x2="424" y2="85" stroke="var(--ink)" strokeWidth="1.4" />
      <line x1="424" y1="46" x2="424" y2="124" stroke="var(--ink)" strokeWidth="1.4" />
      {arrow(424, 486, 46, 'a3')}
      {arrow(424, 486, 124, 'a4')}
      {box(486, 24, 92, 44, 'M1', 'pan servo')}
      {box(486, 102, 92, 44, 'M2', 'tilt servo')}
      <text x="398" y="78" textAnchor="middle" fontFamily="var(--font-mono)"
            fontSize="9.5" fill="var(--muted)">RS485</text>

      {/* 5 V rail */}
      {box(264, 150, 108, 44, 'PS1', '5 V 3 A')}
      <line x1="318" y1="150" x2="318" y2="108" stroke="var(--ink)" strokeWidth="1.4" strokeDasharray="5 4" />
      <text x="380" y="176" fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--muted)">
        servo rail — kept off the controller
      </text>
    </svg>
  )
}
