// Decorative hero background: a deterministic molecular-network field.
// Placeholder for rendered structure images (PyMOL/ChimeraX): drop /public/images/hero.webp
// and set it in app/page.jsx to replace or layer over this.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function MoleculeField() {
  const r = rng(20261031);
  const W = 900, H = 700;
  const nodes = Array.from({ length: 46 }, () => ({
    x: 120 + r() * (W - 160),
    y: 40 + r() * (H - 80),
    r: 2 + r() * 7,
    o: 0.25 + r() * 0.65,
    hue: r() > 0.72 ? 1 : 0,
  }));
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d < 150) edges.push([i, j, d]);
    }
  }
  return (
    <svg className="molecule" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
      <defs>
        <radialGradient id="glow" cx="62%" cy="48%" r="60%">
          <stop offset="0%" stopColor="#4fe3c1" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#4f8cff" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7cf3d1" />
          <stop offset="100%" stopColor="#6aa8ff" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#glow)" />
      {edges.map(([i, j, d], k) => (
        <line
          key={k}
          x1={nodes[i].x} y1={nodes[i].y} x2={nodes[j].x} y2={nodes[j].y}
          stroke="url(#edge)" strokeWidth="1" strokeOpacity={0.5 * (1 - d / 150)}
        />
      ))}
      {nodes.map((n, k) => (
        <g key={k}>
          <circle cx={n.x} cy={n.y} r={n.r * 2.6} fill={n.hue ? "#6aa8ff" : "#7cf3d1"} opacity={n.o * 0.10} />
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.hue ? "#6aa8ff" : "#7cf3d1"} opacity={n.o} />
        </g>
      ))}
    </svg>
  );
}
