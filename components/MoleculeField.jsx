// Decorative hero background (light theme): a molecular-network field with soft out-of-focus blobs.
// Placeholder for rendered structure images (PyMOL/ChimeraX): add /public/images/hero.webp
// and place it in app/page.jsx to replace or layer over this.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ORANGE = "#F39800";
const GRAY = "#363532";

export default function MoleculeField() {
  const r = rng(20261031);
  const W = 900, H = 700;
  const nodes = Array.from({ length: 44 }, () => ({
    x: 120 + r() * (W - 160),
    y: 40 + r() * (H - 80),
    r: 2.5 + r() * 8,
    o: 0.3 + r() * 0.6,
    gray: r() > 0.78,
  }));
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d < 150) edges.push([i, j, d]);
    }
  }
  const blobs = [
    { x: 650, y: 150, r: 70, c: ORANGE, o: 0.22 },
    { x: 780, y: 520, r: 90, c: ORANGE, o: 0.16 },
    { x: 430, y: 560, r: 55, c: GRAY, o: 0.10 },
    { x: 560, y: 60, r: 40, c: GRAY, o: 0.08 },
  ];
  return (
    <svg className="molecule" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
      <defs>
        <radialGradient id="glow" cx="66%" cy="46%" r="55%">
          <stop offset="0%" stopColor={ORANGE} stopOpacity="0.16" />
          <stop offset="60%" stopColor={ORANGE} stopOpacity="0.04" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#glow)" />
      {blobs.map((b, k) => (
        <circle key={k} cx={b.x} cy={b.y} r={b.r} fill={b.c} opacity={b.o} filter="url(#soft)" />
      ))}
      {edges.map(([i, j, d], k) => (
        <line
          key={k}
          x1={nodes[i].x} y1={nodes[i].y} x2={nodes[j].x} y2={nodes[j].y}
          stroke={GRAY} strokeWidth="1" strokeOpacity={0.22 * (1 - d / 150)}
        />
      ))}
      {nodes.map((n, k) => (
        <g key={k}>
          <circle cx={n.x} cy={n.y} r={n.r * 2.4} fill={n.gray ? GRAY : ORANGE} opacity={n.o * 0.08} />
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.gray ? GRAY : ORANGE} opacity={n.o * (n.gray ? 0.55 : 0.85)} />
        </g>
      ))}
    </svg>
  );
}
