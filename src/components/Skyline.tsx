import { C } from '../theme';

/**
 * Istanbul skyline silhouette, left to right:
 * Hagia Sophia · Galata Tower · the Bosphorus (15 July Martyrs) Bridge with ferries below · Çamlıca Tower on its hill.
 * Seagulls drift overhead. Drawn in a 1600×240 box (y from -40 to 200), anchored to the bottom of the hero.
 */

const GROUND = 168;

// Bridge geometry: towers at x=830 and x=1230, cable sags between them.
const T1 = 830, T2 = 1230, TOP = 30, SAG = 192, DECK = 118;
const cableY = (x: number) => {
  const t = (x - T1) / (T2 - T1);
  return (1 - t) ** 2 * TOP + 2 * t * (1 - t) * SAG + t ** 2 * TOP;
};
const hangers = Array.from({ length: 15 }, (_, i) => T1 + ((i + 1) * (T2 - T1)) / 16);
const sideHangers = (from: number, to: number) => Array.from({ length: 4 }, (_, i) => from + ((i + 1) * (to - from)) / 5);

function Minaret({ x, h = 110 }: { x: number; h?: number }) {
  const top = GROUND - h;
  return (
    <g>
      <rect x={x - 3} y={top} width={6} height={h} />
      <rect x={x - 5.5} y={top + h * 0.32} width={11} height={3} />
      <rect x={x - 4.5} y={top + h * 0.12} width={9} height={2.5} />
      <polygon points={`${x - 3.5},${top} ${x},${top - 24} ${x + 3.5},${top}`} />
    </g>
  );
}

function HagiaSophia() {
  return (
    <g>
      <Minaret x={168} h={104} />
      <Minaret x={192} h={112} />
      <Minaret x={408} h={112} />
      <Minaret x={432} h={104} />
      {/* main body and buttresses */}
      <rect x={182} y={140} width={236} height={GROUND - 140} />
      <rect x={204} y={124} width={192} height={18} />
      <rect x={228} y={114} width={26} height={12} />
      <rect x={346} y={114} width={26} height={12} />
      {/* semi-domes */}
      <path d="M204 126 A52 26 0 0 1 300 126 Z" />
      <path d="M300 126 A52 26 0 0 1 396 126 Z" />
      {/* drum + great dome */}
      <rect x={250} y={100} width={100} height={18} />
      <path d="M244 102 A56 40 0 0 1 356 102 Z" />
      <rect x={299} y={56} width={2} height={8} />
      <circle cx={300} cy={55} r={2.2} />
    </g>
  );
}

function GalataTower() {
  return (
    <g>
      {/* Galata rooftops */}
      <path d={`M500 ${GROUND} V146 h22 v-8 h18 v14 h20 v-20 h16 v34 h50 v-18 h20 v8 h24 v-14 h18 V${GROUND} Z`} />
      {/* tower body (slight taper), gallery, upper storey, conical roof */}
      <polygon points={`583,${GROUND} 587,82 613,82 617,${GROUND}`} />
      <rect x={578} y={76} width={44} height={6} />
      <rect x={586} y={58} width={28} height={18} />
      <rect x={582} y={55} width={36} height={4} />
      <polygon points="584,55 600,18 616,55" />
      <rect x={599.2} y={6} width={1.6} height={13} />
    </g>
  );
}

function Bridge() {
  const left = 690, right = 1370;
  return (
    <g>
      {/* towers: two legs + portal beams, down to the water */}
      {[T1, T2].map((x) => (
        <g key={x}>
          <rect x={x - 9} y={TOP} width={5} height={GROUND - TOP + 4} />
          <rect x={x + 4} y={TOP} width={5} height={GROUND - TOP + 4} />
          <rect x={x - 9} y={TOP} width={18} height={4} />
          <rect x={x - 9} y={TOP + 34} width={18} height={3} />
          <rect x={x - 9} y={DECK - 6} width={18} height={4} />
        </g>
      ))}
      {/* deck with approach ramps */}
      <path d={`M${left - 40} ${GROUND} L${left} ${DECK + 2} H${right} L${right + 40} ${GROUND} H${right + 30} L${right - 4} ${DECK + 7} H${left + 4} L${left - 30} ${GROUND} Z`} />
      {/* main cable */}
      <path d={`M${left} ${DECK} L${T1} ${TOP + 2} Q${(T1 + T2) / 2} ${SAG} ${T2} ${TOP + 2} L${right} ${DECK}`} fill="none" strokeWidth={2.2} stroke="currentColor" />
      {/* hangers */}
      <g stroke="currentColor" strokeWidth={0.9} opacity={0.85}>
        {hangers.map((x) => <line key={x} x1={x} x2={x} y1={cableY(x)} y2={DECK} />)}
        {sideHangers(left, T1).map((x) => <line key={`l${x}`} x1={x} x2={x} y1={DECK - ((x - left) / (T1 - left)) * (DECK - TOP)} y2={DECK} />)}
        {sideHangers(T2, right).map((x) => <line key={`r${x}`} x1={x} x2={x} y1={TOP + ((x - T2) / (right - T2)) * (DECK - TOP)} y2={DECK} />)}
      </g>
    </g>
  );
}

function CamlicaTower() {
  return (
    <g>
      {/* Çamlıca hill */}
      <path d={`M1380 ${GROUND} Q1440 128 1490 132 Q1550 136 1600 150 V${GROUND} Z`} />
      {/* slender tapering shaft rising from the hill */}
      <polygon points="1476,136 1502,136 1494,34 1484,34" />
      {/* stacked observation and broadcast decks */}
      <path d="M1471 46 Q1489 54 1507 46 L1503 36 Q1489 40 1475 36 Z" />
      <rect x={1478} y={16} width={22} height={20} rx={4} />
      <path d="M1474 18 Q1489 24 1504 18 L1500 10 Q1489 13 1478 10 Z" />
      <rect x={1483} y={-4} width={12} height={14} rx={2} />
      {/* antenna mast */}
      <polygon points="1486,-4 1492,-4 1490,-36 1488,-36" />
    </g>
  );
}

function Ferry({ x, flip = false }: { x: number; flip?: boolean }) {
  // Classic Istanbul "vapur": low hull, two passenger decks, single funnel.
  return (
    <g transform={`translate(${x} ${GROUND - 4})${flip ? ' scale(-1 1)' : ''}`}>
      <path d="M-38 0 H40 L34 10 H-32 Z" />
      <rect x={-30} y={-9} width={60} height={9} />
      <rect x={-24} y={-16} width={44} height={7} />
      <rect x={6} y={-28} width={8} height={12} />
      <rect x={-34} y={-11} width={70} height={2} />
    </g>
  );
}

const GULLS = [
  { x: 470, y: 46, s: 1.2, d: '0s' }, { x: 510, y: 66, s: 0.8, d: '1.2s' }, { x: 700, y: 38, s: 1, d: '0.6s' },
  { x: 1060, y: 64, s: 0.9, d: '2s' }, { x: 1110, y: 48, s: 1.3, d: '0.3s' }, { x: 1320, y: 24, s: 0.8, d: '1.6s' },
  { x: 90, y: 70, s: 0.9, d: '0.9s' },
];

export default function Skyline() {
  return (
    <svg className="hero-skyline" viewBox="0 -40 1600 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.blue2} stopOpacity="0.35" />
          <stop offset="1" stopColor={C.blueNight} stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* far layer: bridge and Asian-side hill, slightly lighter for depth */}
      <g fill={C.blueNight} color={C.blueNight} opacity={0.72}>
        <Bridge />
        <CamlicaTower />
      </g>

      {/* near layer: historic peninsula and Galata */}
      <g fill={C.blueNight}>
        <rect x={0} y={GROUND - 6} width={720} height={10} />
        <HagiaSophia />
        <GalataTower />
      </g>

      {/* the Bosphorus */}
      <rect x={0} y={GROUND} width={1600} height={200 - GROUND} fill="url(#sky-water)" />
      <g stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1">
        <path d={`M0 ${GROUND + 8} H1600`} strokeDasharray="30 18" />
        <path d={`M20 ${GROUND + 17} H1600`} strokeDasharray="14 26" />
      </g>

      {/* ferries crossing */}
      <g fill={C.blueNight} className="sky-ferry">
        <Ferry x={960} />
      </g>
      <g fill={C.blueNight} className="sky-ferry sky-ferry-2">
        <Ferry x={1300} flip />
      </g>

      {/* seagulls */}
      <g fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="1.6" strokeLinecap="round">
        {GULLS.map((g) => (
          <g key={`${g.x}-${g.y}`} transform={`translate(${g.x} ${g.y}) scale(${g.s})`}>
            <path className="sky-gull" style={{ animationDelay: g.d }} d="M-10 0 Q-5 -6 0 0 Q5 -6 10 0" />
          </g>
        ))}
      </g>
    </svg>
  );
}
