// BioRender-style flat illustrations for the Research page. Pure SVG, no external assets.
const C = {
  blue: ["#DCE9F7", "#4F86C6"], green: ["#D9F0E4", "#2F9A70"], purple: ["#E6E0F7", "#7460C4"],
  orange: ["#FFE3B8", "#E08A00"], gray: ["#E9E9E6", "#7A7A75"], ink: "#2B2F36",
};

export function ArtDefs() {
  const g = (id, a, b) => (<linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>);
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        {g("gBlue", "#EAF2FC", "#C9DDF3")}{g("gGreen", "#E8F6EF", "#C4E7D6")}{g("gPurple", "#EFEAFB", "#D6CDF1")}
        {g("gOrange", "#FFD58A", "#F39800")}{g("gGray", "#F2F2EF", "#DCDCD6")}
        {g("pBlue", "#9CC0EA", "#5E93D0")}{g("pGreen", "#8DD3B4", "#3FAF82")}{g("pPurple", "#B7A8EA", "#7E69CF")}
        <filter id="soft" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#1d2a3a" floodOpacity="0.16" /></filter>
      </defs>
    </svg>
  );
}

// protein: blob + ribbons. size ~150x120 at scale 1
export function Prot({ x = 0, y = 0, s = 1, fill = "pBlue", ink = C.blue[1], rot = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot} 75 60) scale(${s})`} filter="url(#soft)">
      <path d="M20 60 C8 24 46 4 82 9 C124 14 148 36 141 72 C135 106 100 120 64 113 C30 106 26 86 20 60Z" fill={`url(#${fill})`} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
      <g fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="8" strokeLinecap="round">
        <path d="M38 48 C55 30 74 62 94 42 C106 31 116 40 124 52" />
        <path d="M42 84 C60 100 84 78 104 92" />
      </g>
      <g fill="none" stroke={ink} strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round"><path d="M38 48 C55 30 74 62 94 42 C106 31 116 40 124 52" /><path d="M42 84 C60 100 84 78 104 92" /></g>
    </g>
  );
}
const Hex = ({ x, y, r = 9, fill = "url(#gOrange)", stroke = C.orange[1] }) => (
  <polygon points={[0, 1, 2, 3, 4, 5].map((i) => `${x + r * Math.cos((Math.PI / 3) * i + Math.PI / 6)},${y + r * Math.sin((Math.PI / 3) * i + Math.PI / 6)}`).join(" ")} fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
);
const Arrow = ({ x1, y1, x2, y2, color = "#8B8F97", w = 2.4 }) => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
  return (<g stroke={color} strokeWidth={w} strokeLinecap="round" fill="none"><line x1={x1} y1={y1} x2={x2} y2={y2} /><path d={`M${x2 - h * Math.cos(a - 0.5)} ${y2 - h * Math.sin(a - 0.5)} L${x2} ${y2} L${x2 - h * Math.cos(a + 0.5)} ${y2 - h * Math.sin(a + 0.5)}`} /></g>);
};
const Cell = ({ x, y, r, fill = "gGreen", ink = C.green[1], nuc = "#7FC9A8", hot }) => (
  <g filter="url(#soft)"><circle cx={x} cy={y} r={r} fill={`url(#${fill})`} stroke={hot ? C.orange[1] : ink} strokeWidth={hot ? 2.8 : 2} />
    <circle cx={x + r * 0.12} cy={y - r * 0.05} r={r * 0.42} fill={nuc} fillOpacity=".7" stroke={ink} strokeOpacity=".5" strokeWidth="1.4" /></g>
);
const Neuron = ({ x, y, r = 20, arms = [[-1, -1], [1, -1], [-1, 1]], color = C.purple[1] }) => (
  <g filter="url(#soft)">
    {arms.map(([dx, dy], i) => (<g key={i} stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"><path d={`M${x} ${y} Q${x + dx * r * 1.1} ${y + dy * r * 0.4} ${x + dx * r * 1.9} ${y + dy * r * 1.2}`} /><path d={`M${x + dx * r * 1.45} ${y + dy * r * 0.8} l${dx * 8} ${-dy * 4}`} strokeWidth="2.2" /></g>))}
    <circle cx={x} cy={y} r={r} fill="url(#pPurple)" stroke={color} strokeWidth="2.2" /><circle cx={x} cy={y} r={r * 0.4} fill="#fff" fillOpacity=".55" />
  </g>
);
const Shield = ({ x, y, s = 1, fill = "gGreen", ink = C.green[1], check }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#soft)">
    <path d="M0 -34 L28 -24 V4 C28 22 14 32 0 38 C-14 32 -28 22 -28 4 V-24Z" fill={`url(#${fill})`} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
    {check ? <path d="M-11 2 L-3 11 L13 -9" fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /> : (<g fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" strokeOpacity=".75"><path d="M-8 -14 V16" /><path d="M0 -17 V20" /><path d="M8 -14 V16" /></g>)}
  </g>
);
const Pin = ({ x, y, n }) => (<g><circle cx={x} cy={y} r="13" fill="#F39800" stroke="#fff" strokeWidth="2.5" filter="url(#soft)" /><text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">{n}</text></g>);

// ---- hero: three scales
export function ScaleFigure() {
  const P = [[10, "Atoms", "Structure and binding", "gBlue", C.blue[1]], [380, "Cells", "Human NPC and cancer cells", "gGreen", C.green[1]], [750, "Circuits", "Synapse and neural circuit", "gPurple", C.purple[1]]];
  return (
    <svg className="rs-svg" viewBox="0 0 1100 330" role="img" aria-label="Three scales of the research: atoms, cells and circuits, with projects 1 to 3 placed on them">
      {P.map(([x, t, sub, g, ink]) => (
        <g key={t}>
          <rect x={x} y="10" width="340" height="300" rx="30" fill={`url(#${g})`} stroke={ink} strokeOpacity=".35" strokeWidth="1.6" />
          <text x={x + 26} y="50" fontSize="23" fontWeight="700" fill={C.ink}>{t}</text>
          <text x={x + 26} y="72" fontSize="14" fill="#5b616b">{sub}</text>
        </g>
      ))}
      <Arrow x1="352" y1="160" x2="378" y2="160" w={3} /><Arrow x1="722" y1="160" x2="748" y2="160" w={3} />
      {/* atoms */}
      <Prot x={85} y={105} s={1.35} />
      <Hex x={215} y={192} r={14} /><circle cx="215" cy="192" r="26" fill="none" stroke={C.orange[1]} strokeDasharray="4 4" strokeWidth="1.8" />
      {/* cells */}
      <Cell x={510} y={175} r={50} /><Cell x={606} y={128} r={30} hot /><Cell x={598} y={232} r={26} /><Cell x={440} y={120} r={24} /><Cell x={446} y={246} r={20} />
      <g stroke={C.green[1]} strokeOpacity=".45" strokeWidth="1.6" fill="none" strokeDasharray="3 4"><path d="M568 150 L580 142" /><path d="M556 205 L580 222" /></g>
      {/* circuits */}
      <Neuron x={830} y={215} r={24} arms={[[-1, -1], [-1, 1], [1, 1]]} /><Neuron x={1010} y={140} r={24} arms={[[1, -1], [1, 1], [-1, -1]]} />
      <path d="M858 205 C920 190 930 160 984 148" fill="none" stroke={C.purple[1]} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="940" cy="172" r="9" fill="#fff" stroke={C.orange[1]} strokeWidth="2.6" /><circle cx="940" cy="172" r="3.5" fill={C.orange[1]} />
      <Pin x={46} y={282} n="1" /><Pin x={416} y={282} n="2" /><Pin x={446} y={282} n="3" /><Pin x={786} y={282} n="3" /><Pin x={76} y={282} n="2" />
    </svg>
  );
}

// ---- Q1: small GTPase / pseudokinase switch
export function Q1Fig() {
  return (
    <svg className="rs-svg" viewBox="0 0 520 300" role="img" aria-label="A GTPase in its inactive GDP-bound and active GTP-bound state, differing in the switch loops">
      <Prot x={14} y={36} s={1.12} fill="pBlue" /><Prot x={338} y={36} s={1.12} fill="pBlue" ink={C.blue[1]} />
      {/* inactive: loops tucked */}
      <path d="M62 62 q12 -22 26 0 t26 0" fill="none" stroke="#2F5E98" strokeWidth="5" strokeLinecap="round" />
      <rect x="64" y="108" width="52" height="18" rx="9" fill="#D9D9D3" stroke="#8A8A84" strokeWidth="1.8" /><circle cx="76" cy="117" r="3.5" fill="#8A8A84" /><circle cx="90" cy="117" r="3.5" fill="#8A8A84" />
      {/* active: loops open + effector */}
      <path d="M388 56 q26 -40 52 -10 t44 -24" fill="none" stroke="#2F5E98" strokeWidth="5" strokeLinecap="round" />
      <rect x="470" y="14" width="40" height="22" rx="11" fill="url(#pGreen)" stroke={C.green[1]} strokeWidth="1.8" />
      <rect x="388" y="108" width="62" height="18" rx="9" fill="url(#gOrange)" stroke={C.orange[1]} strokeWidth="1.8" /><circle cx="400" cy="117" r="3.5" fill="#fff" /><circle cx="414" cy="117" r="3.5" fill="#fff" /><circle cx="428" cy="117" r="3.5" fill="#fff" />
      <circle cx="102" cy="62" r="52" fill="none" stroke={C.orange[1]} strokeDasharray="5 5" strokeWidth="1.8" /><circle cx="432" cy="52" r="58" fill="none" stroke={C.orange[1]} strokeDasharray="5 5" strokeWidth="1.8" />
      <Arrow x1="196" y1="96" x2="318" y2="96" w={3} /><Arrow x1="318" y1="124" x2="196" y2="124" w={3} />
      <text x="257" y="86" textAnchor="middle" fontSize="12.5" fill="#6b7078">GTP loading</text><text x="257" y="146" textAnchor="middle" fontSize="12.5" fill="#6b7078">GTP hydrolysis</text>
      <text x="90" y="196" textAnchor="middle" fontSize="19" fontWeight="700" fill={C.ink}>Inactive</text><text x="90" y="216" textAnchor="middle" fontSize="13" fill="#6b7078">GDP-bound</text>
      <text x="428" y="196" textAnchor="middle" fontSize="19" fontWeight="700" fill={C.ink}>Active</text><text x="428" y="216" textAnchor="middle" fontSize="13" fill="#6b7078">GTP-bound</text>
      <rect x="130" y="238" width="260" height="42" rx="21" fill="#FFF4DE" stroke={C.orange[1]} strokeOpacity=".6" strokeWidth="1.6" />
      <text x="260" y="256" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#8a5300">How finely can the two states</text><text x="260" y="272" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#8a5300">be told apart?</text>
    </svg>
  );
}

// ---- Q2: degraders + chemical space
export function Q2Fig() {
  const dots = [[70, 218], [88, 236], [106, 214], [118, 238], [82, 250], [134, 224], [100, 252], [60, 238]];
  const hot = [[350, 214], [376, 238], [404, 212], [432, 236], [370, 256], [450, 254], [416, 258], [392, 228]];
  return (
    <svg className="rs-svg" viewBox="0 0 520 300" role="img" aria-label="Molecular glue brings a target to an E3 ligase, ubiquitin tags it, the proteasome degrades it; below, glutarimide chemical space and unexplored non-glutarimide space">
      <Prot x={4} y={12} s={0.58} fill="pGreen" ink={C.green[1]} /><Hex x={92} y={58} r={9} /><Prot x={100} y={14} s={0.58} fill="pBlue" />
      <text x="82" y="112" textAnchor="middle" fontSize="12" fill="#6b7078">E3 ligase · glue · target</text>
      <Arrow x1="176" y1="54" x2="200" y2="54" />
      <Prot x={206} y={14} s={0.58} fill="pBlue" />
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={250 + i * 12} cy={24 - (i % 2) * 10} r="6.5" fill="url(#pPurple)" stroke={C.purple[1]} strokeWidth="1.6" />)}
      <text x="258" y="112" textAnchor="middle" fontSize="12" fill="#6b7078">Ubiquitin tag</text>
      <Arrow x1="326" y1="54" x2="352" y2="54" />
      <g filter="url(#soft)"><rect x="364" y="22" width="76" height="64" rx="20" fill="url(#gGray)" stroke={C.gray[1]} strokeWidth="2" /><g stroke={C.gray[1]} strokeOpacity=".7" strokeWidth="2.4"><line x1="376" y1="40" x2="428" y2="40" /><line x1="376" y1="54" x2="428" y2="54" /><line x1="376" y1="68" x2="428" y2="68" /></g></g>
      {[0, 1, 2].map((i) => <circle key={i} cx={458 + i * 12} cy={58 + (i % 2) * 10} r="4" fill={C.blue[1]} fillOpacity=".6" />)}
      <text x="410" y="112" textAnchor="middle" fontSize="12" fill="#6b7078">Proteasome</text>
      <line x1="10" y1="140" x2="510" y2="140" stroke="#dcdcd6" strokeWidth="1.6" strokeDasharray="2 6" strokeLinecap="round" />
      <rect x="6" y="156" width="508" height="134" rx="22" fill="#F7F9FC" stroke="#dde5ef" strokeWidth="1.6" />
      <text x="24" y="182" fontSize="13.5" fontWeight="700" fill={C.ink}>Chemical space of degraders</text>
      <ellipse cx="100" cy="234" rx="78" ry="40" fill="#ECECE8" stroke="#B9B9B2" strokeWidth="1.6" />
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="#9A9A94" />)}
      <text x="100" y="283" textAnchor="middle" fontSize="12" fill="#6b7078">Glutarimide</text>
      <Arrow x1="196" y1="234" x2="288" y2="234" w={3} color={C.orange[1]} />
      <text x="242" y="222" textAnchor="middle" fontSize="12" fill="#8a5300" fontWeight="600">explore</text>
      <ellipse cx="400" cy="234" rx="100" ry="40" fill="#FFF4DE" stroke={C.orange[1]} strokeWidth="2" strokeDasharray="6 5" />
      {hot.map(([x, y], i) => <Hex key={i} x={x} y={y} r={8.5} />)}
      <text x="400" y="283" textAnchor="middle" fontSize="12" fill="#8a5300" fontWeight="600">Non-glutarimide</text>
    </svg>
  );
}

// ---- Q3: GPCR agonist, neurogenesis, neuroprotection, Molecular Shield
export function Q3Fig() {
  return (
    <svg className="rs-svg" viewBox="0 0 520 300" role="img" aria-label="A GPCR agonist triggers signaling that promotes neurogenesis and neuroprotection; a de novo designed Molecular Shield protein protects neurons">
      <rect x="10" y="112" width="300" height="40" rx="20" fill="url(#gPurple)" stroke={C.purple[1]} strokeOpacity=".5" strokeWidth="1.8" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={96 + i * 17} y={92 + (i % 2) * 4} width="12" height="80" rx="6" fill="url(#pPurple)" stroke={C.purple[1]} strokeWidth="1.8" />)}
      <Hex x={158} y={52} r={13} /><Arrow x1="158" y1="68" x2="158" y2="92" color={C.orange[1]} w={3} />
      <text x="200" y="50" fontSize="13" fontWeight="600" fill="#8a5300">Biased agonist</text>
      <text x="26" y="136" fontSize="12" fill="#5b4aa6">membrane</text>
      <path d="M158 178 C158 205 190 208 232 206" fill="none" stroke="#8B8F97" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 6" />
      <text x="166" y="196" fontSize="12.5" fill="#6b7078">signaling</text>
      <Arrow x1="318" y1="132" x2="346" y2="86" /><Arrow x1="318" y1="140" x2="346" y2="206" />
      <g transform="translate(0 -6)"><Cell x={380} y={70} r={20} nuc="#B7DCC9" /><Arrow x1="404" y1="72" x2="430" y2="72" /><Neuron x={462} y={72} r={14} /></g>
      <text x="430" y="122" textAnchor="middle" fontSize="14" fontWeight="700" fill={C.ink}>Neurogenesis</text>
      <Shield x={380} y={200} s={0.95} check /><Neuron x={460} y={204} r={14} />
      <path d="M418 186 C436 170 452 172 460 186" fill="none" stroke={C.green[1]} strokeWidth="2.4" strokeDasharray="3 4" />
      <text x="430" y="256" textAnchor="middle" fontSize="14" fontWeight="700" fill={C.ink}>Neuroprotection</text>
      <rect x="10" y="226" width="196" height="56" rx="28" fill="#EFF5FC" stroke={C.blue[1]} strokeOpacity=".5" strokeWidth="1.6" />
      <Shield x={42} y={254} s={0.5} fill="gBlue" ink={C.blue[1]} />
      <text x="70" y="251" fontSize="13.5" fontWeight="700" fill={C.ink}>Molecular Shield</text><text x="70" y="269" fontSize="12" fill="#6b7078">de novo designed protein</text>
      <rect x="226" y="226" width="124" height="56" rx="28" fill="none" stroke="#B9B2D9" strokeWidth="1.6" strokeDasharray="5 5" />
      <text x="288" y="251" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#6f65a8">Circuit level</text><text x="288" y="268" textAnchor="middle" fontSize="12" fill="#8a85ab">modulation</text>
    </svg>
  );
}
