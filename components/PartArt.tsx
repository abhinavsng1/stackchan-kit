import type { PartArt as Kind } from '@/lib/kit'

/**
 * One drawing per part in the box. Authored, not stock — and drawn to be
 * recognisable at thumbnail size next to its designator.
 */

const S = { stroke: 'var(--ink)', strokeWidth: 2, strokeLinejoin: 'round' as const }
const T = { stroke: 'var(--ink)', strokeWidth: 1.5, fill: 'none' }

export default function PartArt({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 128 104" className="w-full h-auto" aria-hidden="true">
      {ART[kind]}
    </svg>
  )
}

const ART: Record<Kind, React.ReactNode> = {
  core: (
    <g>
      <rect x="30" y="14" width="68" height="68" rx="9" fill="var(--surface-2)" {...S} />
      <rect x="39" y="25" width="50" height="38" rx="3" fill="var(--screen)" />
      <circle cx="53" cy="42" r="6.5" fill="var(--glow)" />
      <circle cx="75" cy="42" r="6.5" fill="var(--glow)" />
      <path d="M57 55 Q64 60 71 55" stroke="var(--glow)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <rect x="56" y="70" width="16" height="4" rx="2" {...T} />
      <circle cx="38" cy="22" r="1.8" fill="var(--muted)" />
      <circle cx="90" cy="22" r="1.8" fill="var(--muted)" />
    </g>
  ),
  servo: (
    <g>
      <rect x="26" y="30" width="58" height="44" rx="4" fill="var(--mint)" {...S} />
      <rect x="34" y="38" width="42" height="10" rx="2" fill="var(--surface)" opacity=".5" />
      <circle cx="84" cy="40" r="16" fill="var(--surface-2)" {...S} />
      <circle cx="84" cy="40" r="5" fill="var(--ink)" />
      <line x1="84" y1="40" x2="84" y2="28" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 58 L14 58 M26 64 L14 64 M26 70 L14 70" {...T} strokeLinecap="round" />
    </g>
  ),
  driver: (
    <g>
      <rect x="16" y="26" width="96" height="52" rx="4" fill="var(--brand)" {...S} />
      <rect x="26" y="38" width="26" height="20" rx="2" fill="var(--ink)" opacity=".8" />
      <g stroke="var(--surface)" strokeWidth="2.5" strokeLinecap="round" opacity=".9">
        <line x1="64" y1="38" x2="64" y2="52" />
        <line x1="72" y1="38" x2="72" y2="52" />
        <line x1="80" y1="38" x2="80" y2="52" />
        <line x1="88" y1="38" x2="88" y2="52" />
      </g>
      <rect x="62" y="60" width="34" height="9" rx="2" fill="var(--surface)" opacity=".45" />
      <circle cx="22" cy="32" r="2" fill="var(--surface)" opacity=".7" />
      <circle cx="106" cy="72" r="2" fill="var(--surface)" opacity=".7" />
    </g>
  ),
  programmer: (
    <g>
      <rect x="12" y="40" width="30" height="24" rx="3" fill="var(--surface-2)" {...S} />
      <rect x="18" y="46" width="18" height="12" rx="1.5" fill="var(--muted)" opacity=".5" />
      <rect x="42" y="44" width="58" height="16" rx="3" fill="var(--violet)" {...S} />
      <g stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" opacity=".85">
        <line x1="104" y1="46" x2="104" y2="58" />
        <line x1="110" y1="46" x2="110" y2="58" />
      </g>
      <rect x="100" y="42" width="16" height="20" rx="2" fill="var(--surface-2)" {...S} />
    </g>
  ),
  psu: (
    <g>
      <rect x="22" y="22" width="50" height="50" rx="8" fill="var(--surface-2)" {...S} />
      <rect x="31" y="32" width="32" height="18" rx="2" fill="var(--ink)" opacity=".16" />
      <g stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round">
        <line x1="38" y1="22" x2="38" y2="12" />
        <line x1="56" y1="22" x2="56" y2="12" />
      </g>
      <text x="47" y="64" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11"
            fontWeight="600" fill="var(--ink)">5V3A</text>
      <path d="M72 58 C 94 58, 92 82, 108 82" stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="104" y="75" width="18" height="14" rx="3" fill="var(--amber)" {...S} />
      <circle cx="113" cy="82" r="2.6" fill="var(--ink)" />
    </g>
  ),
  shell: (
    <g>
      <path d="M28 78 L28 40 Q28 22 46 22 L82 22 Q100 22 100 40 L100 78 Z"
            fill="var(--amber)" {...S} />
      <path d="M40 78 L40 52 Q40 44 48 44 L80 44 Q88 44 88 52 L88 78"
            fill="var(--surface)" opacity=".55" stroke="var(--ink)" strokeWidth="1.5" />
      <rect x="18" y="78" width="92" height="9" rx="3" fill="var(--surface-2)" {...S} />
    </g>
  ),
  cables: (
    <g>
      <g fill="none" strokeWidth="3.5" strokeLinecap="round">
        <path d="M18 34 C 48 24, 80 44, 110 34" stroke="var(--brand)" />
        <path d="M18 46 C 48 36, 80 56, 110 46" stroke="var(--amber)" />
        <path d="M18 58 C 48 48, 80 68, 110 58" stroke="var(--mint)" />
        <path d="M18 70 C 48 60, 80 80, 110 70" stroke="var(--violet)" />
      </g>
      <rect x="10" y="28" width="10" height="48" rx="2" fill="var(--surface-2)" {...S} />
      <rect x="108" y="28" width="10" height="48" rx="2" fill="var(--surface-2)" {...S} />
    </g>
  ),
  grove: (
    <g>
      <rect x="14" y="38" width="26" height="28" rx="3" fill="var(--mint)" {...S} />
      <g fill="none" strokeWidth="3" strokeLinecap="round">
        <path d="M40 44 C 66 44, 78 26, 106 26" stroke="var(--ink)" />
        <path d="M40 50 C 66 50, 78 40, 106 40" stroke="var(--danger)" />
        <path d="M40 56 C 66 56, 78 58, 106 58" stroke="var(--amber)" />
        <path d="M40 62 C 66 62, 78 72, 106 72" stroke="var(--brand)" />
      </g>
      {[26, 40, 58, 72].map((y) => (
        <rect key={y} x="104" y={y - 4} width="14" height="8" rx="1.5" fill="var(--surface-2)" stroke="var(--ink)" strokeWidth="1.5" />
      ))}
    </g>
  ),
  screws: (
    <g>
      <g>
        <rect x="34" y="18" width="20" height="8" rx="2" fill="var(--surface-2)" {...S} />
        <path d="M38 26 L50 26 L47 74 L41 74 Z" fill="var(--surface-2)" {...S} />
        <g stroke="var(--ink)" strokeWidth="1.3" opacity=".55">
          <line x1="39" y1="36" x2="49" y2="34" /><line x1="39" y1="44" x2="49" y2="42" />
          <line x1="40" y1="52" x2="48" y2="50" /><line x1="40" y1="60" x2="48" y2="58" />
        </g>
        <line x1="38" y1="22" x2="50" y2="22" stroke="var(--ink)" strokeWidth="1.8" />
      </g>
      <g>
        <rect x="74" y="30" width="16" height="7" rx="2" fill="var(--surface-2)" {...S} />
        <path d="M77 37 L87 37 L85 74 L79 74 Z" fill="var(--surface-2)" {...S} />
        <g stroke="var(--ink)" strokeWidth="1.2" opacity=".55">
          <line x1="78" y1="46" x2="86" y2="44" /><line x1="78" y1="54" x2="86" y2="52" />
          <line x1="79" y1="62" x2="85" y2="60" />
        </g>
        <line x1="77" y1="33.5" x2="87" y2="33.5" stroke="var(--ink)" strokeWidth="1.6" />
      </g>
    </g>
  ),
  caps: (
    <g>
      {[
        [30, 'var(--brand)'],
        [74, 'var(--violet)'],
      ].map(([x, c]) => (
        <g key={x as number}>
          <rect x={x as number} y="20" width="26" height="46" rx="7" fill={c as string} {...S} />
          <ellipse cx={(x as number) + 13} cy="20" rx="13" ry="5" fill="var(--surface-2)" {...S} />
          <rect x={(x as number) + 3} y="28" width="7" height="30" rx="3.5" fill="var(--surface)" opacity=".55" />
          <path d={`M${(x as number) + 8} 66 L${(x as number) + 8} 84 M${(x as number) + 18} 66 L${(x as number) + 18} 84`}
                stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
    </g>
  ),
}
