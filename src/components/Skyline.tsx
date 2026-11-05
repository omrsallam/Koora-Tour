import { C } from '../theme';

/**
 * Istanbul skyline silhouette, left to right:
 * Hagia Sophia · Galata Tower on its islet · the Bosphorus Bridge with ferries · Çamlıca Tower on its hill.
 *
 * Every shape is fully opaque so the background rings never show through, and windows are true
 * cut-outs (SVG masks). Drawn in a 1600×240 box (y from -40 to 200); the waterline sits at y=168.
 */

const GROUND = 168;
// Solid fills (no transparency): the near layer is darkest, the far layer slightly lighter for depth.
const NEAR = C.blueNight;
const FAR = '#050d40';

/* ------------------------------------------------------------------ */
/* Hagia Sophia — drawn in the reference's 800×800 space, then scaled  */
/* ------------------------------------------------------------------ */
function Minaret({ cx, base, tip, w, balconies }: { cx: number; base: number; tip: number; w: number; balconies: number[] }) {
  const shaftTop = tip + (base - tip) * 0.32;
  return (
    <g>
      <rect x={cx - w / 2} y={shaftTop} width={w} height={base - shaftTop} />
      <rect x={cx - w / 2 + 3} y={tip + 50} width={w - 6} height={shaftTop - tip - 50} />
      <polygon points={`${cx - w / 2 + 3},${tip + 52} ${cx},${tip} ${cx + w / 2 - 3},${tip + 52}`} />
      {balconies.map((y) => <rect key={y} x={cx - w / 2 - 8} y={y} width={w + 16} height={12} />)}
    </g>
  );
}

function HagiaSophia({ x, scale }: { x: number; scale: number }) {
  // Reference ground line is y=690; translate so it lands on GROUND.
  const ty = GROUND - 690 * scale;
  const arch = (cx: number, top: number, w: number, bottom: number) =>
    `M${cx - w / 2} ${bottom} V${top + w / 2} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${top + w / 2} V${bottom} Z`;
  const slots = Array.from({ length: 10 }, (_, i) => 302 + i * 20);
  return (
    <g transform={`translate(${x} ${ty}) scale(${scale})`}>
      <defs>
        <mask id="hs-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="700">
          <rect x="0" y="0" width="800" height="700" fill="#fff" />
          <g fill="#000">
            {/* arched windows along the base */}
            {[118, 178, 236, 564, 622, 682].map((cx) => <path key={cx} d={arch(cx, 618, 22, 672)} />)}
            {/* central portal and side slots */}
            <path d={arch(400, 594, 44, 674)} />
            <rect x={340} y={584} width={16} height={90} />
            <rect x={444} y={584} width={16} height={90} />
            {/* drum windows under the great dome */}
            {slots.map((sx) => <rect key={sx} x={sx} y={356} width={9} height={22} />)}
            {/* windows of the front inner dome */}
            {[350, 375, 400, 425, 450].map((cx) => <path key={cx} d={arch(cx, 512, 12, 538)} />)}
            {/* side-dome windows */}
            {[208, 232, 256, 280, 520, 544, 568, 592].map((cx) => <path key={cx} d={arch(cx, 506, 10, 528)} />)}
          </g>
          {/* fine separation lines, as in the reference */}
          <g fill="none" stroke="#000" strokeWidth="5">
            <path d="M300 545 V440 A100 70 0 0 1 500 440 V545" />
            <path d="M328 545 V505 A72 52 0 0 1 472 505 V545" />
            <path d="M118 560 H682" />
            <path d="M288 386 H512" />
            <path d="M80 594 H288 M512 594 H720" />
          </g>
        </mask>
      </defs>
      <g mask="url(#hs-cut)">
        {/* outer minarets (tall) and inner minarets (short) */}
        <Minaret cx={113} base={600} tip={105} w={28} balconies={[296, 396]} />
        <Minaret cx={687} base={600} tip={105} w={28} balconies={[296, 396]} />
        <Minaret cx={186} base={560} tip={295} w={18} balconies={[366, 420]} />
        <Minaret cx={614} base={560} tip={295} w={18} balconies={[366, 420]} />
        {/* base and terraces */}
        <rect x={78} y={593} width={644} height={97} />
        <rect x={118} y={558} width={564} height={38} />
        {/* outer half-domes */}
        <path d="M143 560 A47 44 0 0 1 237 560 Z" />
        <path d="M563 560 A47 44 0 0 1 657 560 Z" />
        {/* side domes on drums */}
        <rect x={192} y={498} width={106} height={62} />
        <rect x={502} y={498} width={106} height={62} />
        <path d="M186 502 A59 50 0 0 1 304 502 Z" />
        <path d="M496 502 A59 50 0 0 1 614 502 Z" />
        {/* little corner turrets */}
        {[258, 542].map((cx) => (
          <g key={cx}>
            <rect x={cx - 20} y={398} width={40} height={60} />
            <path d={`M${cx - 21} 400 A21 24 0 0 1 ${cx + 21} 400 Z`} />
            <rect x={cx - 2} y={370} width={4} height={8} />
          </g>
        ))}
        {/* central block, drum and the great dome with its spire */}
        <rect x={285} y={346} width={230} height={250} />
        <path d="M290 348 A110 84 0 0 1 510 348 Z" />
        <rect x={380} y={258} width={40} height={10} rx={4} />
        <polygon points="391,262 400,180 409,262" />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Galata Tower on its walled islet — reference 750×750 space         */
/* ------------------------------------------------------------------ */
function GalataTower({ x, scale }: { x: number; scale: number }) {
  const ty = GROUND - 508 * scale;
  const crenels = (x0: number, x1: number, y: number) => {
    const out: string[] = [];
    for (let cx = x0; cx < x1 - 4; cx += 12) out.push(`M${cx} ${y} h7 v-8 h-7 Z`);
    return out.join(' ');
  };
  return (
    <g transform={`translate(${x} ${ty}) scale(${scale})`}>
      <defs>
        <mask id="gt-cut" maskUnits="userSpaceOnUse" x="200" y="60" width="400" height="460">
          <rect x="200" y="60" width="400" height="460" fill="#fff" />
          <g fill="#000">
            {[343, 371, 399].map((wx) => <path key={wx} d={`M${wx} 330 V312 A6 6 0 0 1 ${wx + 12} 312 V330 Z`} />)}
            <rect x={370} y={270} width={8} height={10} />
          </g>
        </mask>
      </defs>
      <g mask="url(#gt-cut)">
        {/* rocky islet */}
        <path d="M250 512 Q262 494 290 500 H545 Q566 498 572 512 Z" />
        {/* crenellated walls */}
        <rect x={284} y={446} width={52} height={60} />
        <path d={crenels(284, 336, 446)} />
        <rect x={428} y={470} width={104} height={36} />
        <path d={crenels(428, 532, 470)} />
        {/* main shaft */}
        <polygon points="331,505 336,344 424,344 429,505" />
        {/* window storey + crenellated gallery */}
        <rect x={326} y={292} width={108} height={54} />
        <rect x={320} y={340} width={120} height={8} />
        <rect x={322} y={284} width={116} height={10} />
        <path d={crenels(324, 438, 284)} />
        <rect x={334} y={262} width={92} height={14} />
        {/* conical roof, finial and flag */}
        <polygon points="336,262 380,150 424,262" />
        <circle cx={380} cy={142} r={5} />
        <circle cx={380} cy={128} r={4} />
        <rect x={378.5} y={82} width={3} height={50} />
        <path d="M381 86 Q392 82 401 90 Q395 96 401 106 Q391 100 381 104 Z" />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Bosphorus Bridge                                                    */
/* ------------------------------------------------------------------ */
const T1 = 850, T2 = 1210, TOP = 36, SAG = 186, DECK = 116;
const cableY = (x: number) => {
  const t = (x - T1) / (T2 - T1);
  return (1 - t) ** 2 * TOP + 2 * t * (1 - t) * SAG + t ** 2 * TOP;
};
function Bridge() {
  const left = 740, right = 1320;
  const mid = Array.from({ length: 13 }, (_, i) => T1 + ((i + 1) * (T2 - T1)) / 14);
  const side = (a: number, b: number) => Array.from({ length: 3 }, (_, i) => a + ((i + 1) * (b - a)) / 4);
  return (
    <g fill={FAR} stroke={FAR}>
      {[T1, T2].map((x) => (
        <g key={x} stroke="none">
          <rect x={x - 9} y={TOP} width={5} height={GROUND - TOP} />
          <rect x={x + 4} y={TOP} width={5} height={GROUND - TOP} />
          <rect x={x - 9} y={TOP} width={18} height={4} />
          <rect x={x - 9} y={TOP + 32} width={18} height={3} />
          <rect x={x - 9} y={DECK - 6} width={18} height={4} />
        </g>
      ))}
      <path stroke="none" d={`M${left - 36} ${GROUND} L${left} ${DECK + 2} H${right} L${right + 36} ${GROUND} H${right + 26} L${right - 4} ${DECK + 7} H${left + 4} L${left - 26} ${GROUND} Z`} />
      <path fill="none" strokeWidth={2.4} d={`M${left} ${DECK} L${T1} ${TOP + 2} Q${(T1 + T2) / 2} ${SAG} ${T2} ${TOP + 2} L${right} ${DECK}`} />
      <g strokeWidth={1}>
        {mid.map((x) => <line key={x} x1={x} x2={x} y1={cableY(x)} y2={DECK} />)}
        {side(left, T1).map((x) => <line key={`l${x}`} x1={x} x2={x} y1={DECK - ((x - left) / (T1 - left)) * (DECK - TOP)} y2={DECK} />)}
        {side(T2, right).map((x) => <line key={`r${x}`} x1={x} x2={x} y1={TOP + ((x - T2) / (right - T2)) * (DECK - TOP)} y2={DECK} />)}
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Çamlıca Tower — reference 1333×2000 space                          */
/* ------------------------------------------------------------------ */
function CamlicaTower({ x, scale }: { x: number; scale: number }) {
  const ty = 146 - 1950 * scale; // plinth sits on the hilltop (y≈146)
  // Body outline: slim banded shaft that swells into a pear shape and tapers to the antenna.
  const body = 'M664 1950 L667 1500 C664 1400 652 1330 650 1260 C646 1170 628 1110 632 1040 C636 960 668 920 690 900 L712 900 C732 920 768 980 766 1060 C764 1130 742 1190 738 1260 C735 1330 724 1400 722 1500 L726 1950 Z';
  const rungs = Array.from({ length: 14 }, (_, i) => 520 + i * 27);
  return (
    <g transform={`translate(${x} ${ty}) scale(${scale})`}>
      <rect x={572} y={1940} width={198} height={22} />
      <path d={body} />
      {/* banded rings on the lower shaft */}
      {[1380, 1420, 1460].map((y) => <rect key={y} x={646} y={y} width={98} height={12} />)}
      {/* lattice antenna and needle */}
      <polygon points="688,902 712,902 707,480 693,480" />
      {rungs.map((y) => <rect key={y} x={685} y={y} width={30} height={5} />)}
      <polygon points="696,482 704,482 701,410 699,410" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Boats & gulls                                                       */
/* ------------------------------------------------------------------ */
function Ferry({ x, flip = false }: { x: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${GROUND - 3})${flip ? ' scale(-1 1)' : ''}`}>
      <path d="M-38 0 H40 L34 10 H-32 Z" />
      <rect x={-30} y={-9} width={60} height={9} />
      <rect x={-24} y={-16} width={44} height={7} />
      <rect x={6} y={-28} width={8} height={12} />
      <rect x={-34} y={-11} width={70} height={2} />
    </g>
  );
}

/** Small fishing boat, after the reference: cabin with windows, railings and a flag mast. */
function FishingBoat({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${GROUND - 2})`}>
      <defs>
        <mask id={`fb-${x}`} maskUnits="userSpaceOnUse" x="-30" y="-30" width="64" height="44">
          <rect x="-30" y="-30" width="64" height="44" fill="#fff" />
          {[-6, -1, 4, 9].map((wx) => <rect key={wx} x={wx} y={-14} width={3} height={4} fill="#000" />)}
        </mask>
      </defs>
      <g mask={`url(#fb-${x})`}>
        <path d="M-26 -2 H30 L24 9 H-21 Z" />
        <rect x={-9} y={-17} width={22} height={15} />
        <rect x={-12} y={-19} width={28} height={3} />
        <rect x={-25} y={-8} width={14} height={1.5} />
        <rect x={-25} y={-8} width={1.5} height={6} />
        <rect x={-19} y={-26} width={1.5} height={24} />
        <path d="M-17.5 -26 L-11 -24 L-17.5 -22 Z" />
      </g>
    </g>
  );
}

// Gulls only fly above the right-hand half, well clear of the hero text and buttons.
const GULLS = [
  { x: 1010, y: 24, s: 1.2, d: '0s' }, { x: 1060, y: 50, s: 0.85, d: '1.1s' }, { x: 1140, y: 10, s: 1, d: '0.5s' },
  { x: 1300, y: 4, s: 0.8, d: '1.7s' }, { x: 1390, y: 40, s: 1.1, d: '0.8s' }, { x: 960, y: 66, s: 0.75, d: '2.2s' },
];

export default function Skyline() {
  return (
    <svg className="hero-skyline" viewBox="0 -40 1600 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1f7e" />
          <stop offset="1" stopColor={C.blueNight} />
        </linearGradient>
      </defs>

      {/* far layer: bridge and the Asian shore with Çamlıca */}
      <Bridge />
      <g fill={FAR}>
        <path d={`M1360 ${GROUND} Q1420 144 1490 142 Q1560 142 1600 150 V${GROUND} Z`} />
        <CamlicaTower x={1400} scale={0.122} />
      </g>

      {/* near layer: historic peninsula with Hagia Sophia */}
      <g fill={NEAR}>
        <path d={`M0 ${GROUND} V${GROUND - 8} H40 v-6 h26 v6 H130 V${GROUND - 4} H500 v-10 h22 v10 h30 V${GROUND} Z`} />
        <HagiaSophia x={150} scale={0.3} />
      </g>

      {/* the Bosphorus — opaque so the background rings stop at the waterline */}
      <rect x={0} y={GROUND} width={1600} height={200 - GROUND} fill="url(#sky-water)" />
      <g stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1">
        <path d={`M0 ${GROUND + 8} H1600`} strokeDasharray="30 18" />
        <path d={`M20 ${GROUND + 17} H1600`} strokeDasharray="14 26" />
      </g>

      {/* Galata Tower on its islet, in front of the water */}
      <g fill={NEAR}>
        <GalataTower x={480} scale={0.33} />
      </g>

      {/* boats */}
      <g fill={NEAR} className="sky-ferry"><Ferry x={1000} /></g>
      <g fill={NEAR} className="sky-ferry sky-ferry-2"><Ferry x={1250} flip /></g>
      <g fill={NEAR}><FishingBoat x={455} /></g>

      {/* seagulls */}
      <g fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.6" strokeLinecap="round">
        {GULLS.map((g) => (
          <g key={`${g.x}-${g.y}`} transform={`translate(${g.x} ${g.y}) scale(${g.s})`}>
            <path className="sky-gull" style={{ animationDelay: g.d }} d="M-10 0 Q-5 -6 0 0 Q5 -6 10 0" />
          </g>
        ))}
      </g>
    </svg>
  );
}
