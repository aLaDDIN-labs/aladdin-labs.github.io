// Hand-drawn style banner for the Members page. Pure SVG, so the text stays crisp and editable.
const INK = "#2b2f3a";
const OR = "#f39800";
const PALE = "#fdeccd";
const W = 2.6;

const Line = (p) => <path fill="none" stroke={INK} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" {...p} />;

function Face({ x: X, y: Y, hair = "short", glasses = true, mood = "smile" }) {
  const x = +X, y = +Y;
  const hairPath =
    hair === "long"
      ? `M${x - 27},${y} C${x - 34},${y - 40} ${x + 30},${y - 48} ${x + 27},${y} C${x + 36},${y + 36} ${x + 30},${y + 50} ${x + 22},${y + 56} L${x + 20},${y - 6} C${x},${y - 20} ${x - 14},${y - 18} ${x - 20},${y - 6} L${x - 22},${y + 56} C${x - 32},${y + 48} ${x - 34},${y + 30} ${x - 27},${y}Z`
      : `M${x - 27},${y - 4} C${x - 30},${y - 38} ${x + 28},${y - 42} ${x + 27},${y - 4} C${x + 14},${y - 24} ${x - 10},${y - 18} ${x - 27},${y - 4}Z`;
  return (
    <g>
      <circle cx={x} cy={y} r="27" fill="#fff" stroke={INK} strokeWidth={W} />
      <path d={hairPath} fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {glasses && (
        <g fill="none" stroke={OR} strokeWidth="3">
          <circle cx={x - 10} cy={y + 2} r="8" />
          <circle cx={x + 12} cy={y + 2} r="8" />
          <path d={`M${x - 2},${y + 2} L${x + 4},${y + 2}`} />
        </g>
      )}
      <circle cx={x - 10} cy={y + 3} r="1.8" fill={INK} />
      <circle cx={x + 12} cy={y + 3} r="1.8" fill={INK} />
      {mood === "smile" && <Line d={`M${x - 7},${y + 15} Q${x + 1},${y + 22} ${x + 9},${y + 15}`} strokeWidth="2.2" />}
      {mood === "tired" && <Line d={`M${x - 7},${y + 19} Q${x + 1},${y + 13} ${x + 9},${y + 19}`} strokeWidth="2.2" />}
      {mood === "o" && <circle cx={x + 1} cy={y + 17} r="3.5" fill="none" stroke={INK} strokeWidth="2" />}
    </g>
  );
}

// standing person; (x, y) = head centre
function Person({ x: X, y: Y, hair, mood, arms, orange = true }) {
  const x = +X, y = +Y;
  return (
    <g>
      <path d={`M${x - 20},${y + 30} L${x + 20},${y + 30} L${x + 32},${y + 150} L${x - 32},${y + 150}Z`} fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
      <path d={`M${x - 8},${y + 30} L${x},${y + 78} L${x + 8},${y + 30}Z`} fill={orange ? OR : PALE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <Line d={`M${x - 14},${y + 150} L${x - 16},${y + 205}`} />
      <Line d={`M${x + 14},${y + 150} L${x + 16},${y + 205}`} />
      <Line d={`M${x - 16},${y + 205} l-14,2`} />
      <Line d={`M${x + 16},${y + 205} l14,2`} />
      <Face x={x} y={y} hair={hair} mood={mood} />
      {arms}
    </g>
  );
}

function Bubble({ x: X, y: Y, w: Wd, h: Ht, tail = "bl", children }) {
  const x = +X, y = +Y, w = +Wd, h = +Ht;
  const tx = tail.includes("l") ? x + 24 : x + w - 24;
  const dir = tail.includes("l") ? -1 : 1;
  const tailPath = tail.startsWith("b")
    ? `M${tx - 10},${y + h} L${tx + dir * 6},${y + h + 24} L${tx + 12},${y + h}`
    : `M${tx - 10},${y} L${tx + dir * 6},${y - 24} L${tx + 12},${y}`;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="18" fill="#fff" stroke={INK} strokeWidth={W} />
      <path d={tailPath} fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
      <path d={tail.startsWith("b") ? `M${tx - 8},${y + h} L${tx + 10},${y + h}` : `M${tx - 8},${y} L${tx + 10},${y}`} stroke="#fff" strokeWidth="4" />
      {children}
    </g>
  );
}

const helix = (cx, cy, len, ang, r = 16, turns = 5) => {
  const pts = [];
  for (let i = 0; i <= turns * 2; i++) {
    const t = i / (turns * 2);
    pts.push([-len / 2 + t * len, (i % 2 ? -1 : 1) * r]);
  }
  const rad = (ang * Math.PI) / 180;
  const R = ([a, b]) => [cx + a * Math.cos(rad) - b * Math.sin(rad), cy + a * Math.sin(rad) + b * Math.cos(rad)];
  const P = pts.map(R);
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 1; i < P.length; i++) {
    const [px, py] = P[i - 1];
    const [qx, qy] = P[i];
    d += ` Q${(px + (qx - px) * 0.1 + (qy - py) * 0.9).toFixed(1)},${(py + (qy - py) * 0.1 - (qx - px) * 0.9).toFixed(1)} ${qx.toFixed(1)},${qy.toFixed(1)}`;
  }
  return d;
};

export default function MembersArt({ base = "" }) {
  const font = `"Patrick Hand", "Segoe Print", "Comic Sans MS", cursive`;
  return (
    <div className="mart" aria-hidden="true">
      <style>{`@font-face{font-family:"Patrick Hand";src:url("${base}/fonts/PatrickHand-Regular.ttf") format("truetype");font-display:swap}`}</style>
      <svg viewBox="0 0 2000 420" role="img" aria-label="Illustration of lab members" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="rough" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
          </filter>
        </defs>
        <g filter="url(#rough)" fontFamily={font}>
          {/* ---------- lamp + wish ---------- */}
          <g>
            <path d="M52,372 Q56,338 112,336 Q168,336 176,372Z" fill={PALE} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
            <path d="M176,352 Q214,340 226,318 Q232,336 206,362" fill={PALE} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
            <Line d="M54,352 Q22,350 30,322 Q40,306 58,322" />
            <Line d="M86,334 Q112,318 138,334" />
            <Line d="M70,372 L66,384 L168,384 L160,372" />
            <Line d="M226,318 C250,288 190,262 200,226 C210,196 130,196 120,160" stroke={OR} strokeWidth="3.4" />
            <Bubble x="24" y="40" w="200" h="104" tail="bl">
              <text x="124" y="80" textAnchor="middle" fontSize="27" fill={INK}>1 wish:</text>
              <text x="124" y="120" textAnchor="middle" fontSize="33" fill={OR} fontWeight="700">p &lt; 0.05</text>
            </Bubble>
          </g>

          {/* ---------- two people talking ---------- */}
          <g>
            <Person x="318" y="196" hair="long" mood="o"
              arms={<><Line d="M298,230 Q282,262 300,288" /><Line d="M338,230 Q356,256 376,252" /></>} />
            <Person x="428" y="200" hair="short" mood="smile" orange={false}
              arms={<><Line d="M406,234 Q388,262 396,280" /><Line d="M450,234 Q468,220 476,196" /></>} />
            <Bubble x="250" y="60" w="170" h="62" tail="br">
              <text x="335" y="100" textAnchor="middle" fontSize="30" fill={INK}>It worked?!</text>
            </Bubble>
            <Bubble x="430" y="108" w="120" h="56" tail="bl">
              <text x="490" y="146" textAnchor="middle" fontSize="30" fill={INK}>n = 1.</text>
            </Bubble>
          </g>

          {/* ---------- flying carpet ---------- */}
          <g transform="translate(30 30) scale(0.85) rotate(-6 760 190)">
            <path d="M600,242 L890,230 L930,276 L560,288Z" fill={PALE} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
            <Line d="M626,252 L880,242" stroke={OR} strokeWidth="2.6" />
            <Line d="M606,268 L918,258" stroke={OR} strokeWidth="2.6" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (<Line key={i} d={`M${572 + i * 14},288 l-2,16`} stroke={OR} strokeWidth="2.4" />))}
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (<Line key={i} d={`M${900 + i * 4},${238 + i * 6} l12,2`} stroke={OR} strokeWidth="2.4" />))}
            {/* rider 1 */}
            <Line d="M650,236 Q690,252 740,238" />
            <path d="M672,234 L732,232 L720,176 L686,176Z" fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
            <rect x="642" y="214" width="62" height="30" rx="4" fill="#fff" stroke={INK} strokeWidth={W} />
            <Face x="702" y="146" hair="long" mood="smile" />
            {/* rider 2 */}
            <Line d="M770,238 Q816,254 860,240" />
            <path d="M790,236 L848,234 L838,178 L804,178Z" fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
            <rect x="760" y="216" width="58" height="28" rx="4" fill="#fff" stroke={INK} strokeWidth={W} />
            <Face x="822" y="148" hair="short" mood="smile" />
            <Line d="M850,196 Q880,170 872,146" />
          </g>
          <Bubble x="590" y="24" w="188" h="60" tail="bl">
            <text x="684" y="64" textAnchor="middle" fontSize="32" fill={INK}>Here we go!</text>
          </Bubble>
          {/* trail + sparkles */}
          <path d="M240,300 C320,330 420,330 520,308" fill="none" stroke={OR} strokeWidth="2.4" strokeDasharray="2 12" strokeLinecap="round" />
          {[[580, 340], [660, 356], [760, 340], [860, 360], [940, 330]].map(([a, b], i) => (
            <path key={i} d={`M${a},${b - 8} L${a},${b + 8} M${a - 8},${b} L${a + 8},${b}`} stroke={i % 2 ? OR : INK} strokeWidth="2.4" strokeLinecap="round" />
          ))}
          <g stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M960,70 l12,-8 l12,8 v14 l-12,8 l-12,-8z M972,62 v-22 M984,84 l18,10" />
          </g>

          {/* ---------- title ---------- */}
          <g textAnchor="middle" fill={INK}>
            <text x="1108" y="232" fontSize="84" fontWeight="700" stroke={INK} strokeWidth="1.4">Lab Members</text>
            <text x="1108" y="284" fontSize="40">(The people of <tspan fill={OR} fontWeight="700">a</tspan>L<tspan fill={OR} fontWeight="700">a</tspan>DDIN)</text>
            <path d="M905,306 C1010,294 1130,320 1312,302" fill="none" stroke={OR} strokeWidth="9" strokeLinecap="round" />
          </g>

          {/* ---------- protein + fishing ---------- */}
          <g>
            <path d={helix(1400, 130, 120, -30, 17)} fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            <path d={helix(1440, 190, 130, 40, 16)} fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            <path d={helix(1385, 235, 110, 85, 15, 4)} fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            <path d={helix(1470, 110, 100, 70, 14, 4)} fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            <Line d="M1360,80 C1400,60 1470,76 1480,120 M1500,200 C1500,250 1440,280 1400,262" stroke={OR} strokeWidth="3" />
            <Person x="1620" y="196" hair="short" mood="smile"
              arms={<><Line d="M1598,230 Q1570,246 1560,260" /><Line d="M1642,230 Q1654,246 1650,262" /></>} />
            <Line d="M1556,264 L1470,40" stroke="#8a5a1d" strokeWidth="4" />
            <Line d="M1470,40 C1456,90 1452,120 1474,150" strokeWidth="1.8" />
            <circle cx="1478" cy="162" r="15" fill={OR} stroke={INK} strokeWidth={W} />
            <text x="1478" y="168" textAnchor="middle" fontSize="17" fill="#fff" fontWeight="700">E3</text>
            <Bubble x="1556" y="56" w="144" h="56" tail="bl">
              <text x="1628" y="94" textAnchor="middle" fontSize="29" fill={INK}>Any bites?</text>
            </Bubble>
          </g>

          {/* ---------- tired at desk ---------- */}
          <g>
            <path d="M1740,348 L1980,348 M1760,348 L1754,404 M1960,348 L1966,404" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
            <path d="M1736,348 L1984,348 L1980,360 L1740,360Z" fill={PALE} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
            {[0, 1, 2, 3, 4].map((i) => (<rect key={i} x={1888 + (i % 2) * 5} y={340 - (i + 1) * 12} width="70" height="11" fill="#fff" stroke={INK} strokeWidth="2.2" />))}
            <path d="M1790,348 L1792,318 L1822,318 L1824,348" fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
            <path d="M1824,326 q16,2 12,14 q-4,6 -12,4" fill="none" stroke={INK} strokeWidth="2.4" />
            <Line d="M1800,308 q-8,-12 2,-22 M1812,308 q-8,-12 2,-22" strokeWidth="2" />
            <path d="M1836,348 L1842,250 L1884,250 L1892,348Z" fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
            <path d="M1855,252 L1863,282 L1872,252Z" fill={OR} stroke={INK} strokeWidth="2" />
            <Face x="1862" y="222" hair="short" mood="tired" />
            <Line d="M1842,262 Q1822,236 1846,206" />
            <Line d="M1884,262 Q1904,236 1880,206" />
            <path d="M1934,320 l40,-6 M1938,304 l36,-6" stroke={INK} strokeWidth="2" strokeLinecap="round" />
            <Bubble x="1716" y="24" w="264" h="104" tail="bl">
              <text x="1848" y="62" textAnchor="middle" fontSize="24" fill={INK}>Reviewer 2:</text>
              <text x="1848" y="102" textAnchor="middle" fontSize="28" fill={OR} fontWeight="700">one more experiment…</text>
            </Bubble>
          </g>
        </g>
      </svg>
    </div>
  );
}
