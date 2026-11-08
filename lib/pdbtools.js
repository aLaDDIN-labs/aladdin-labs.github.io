// Pure helpers for the PDB viewer: ligand detection, contacts, 2D contact map, illust post-processing.
export const CHAIN_COLORS = ["#F2B14E", "#A08CF0", "#5FD3A4", "#E8803A", "#4C8FC9", "#D9577F", "#7C9B46", "#8F6CC0"];
const SOLVENT = new Set(["HOH", "WAT", "DOD", "H2O", "SO4", "PO4", "GOL", "EDO", "PEG", "PGE", "DMS", "ACT", "FMT", "TRS", "MPD", "CL", "NA", "K", "MG", "ZN", "CA", "MN", "FE", "CU", "CD", "NI", "CO", "IOD", "BR", "NO3", "NH4"]);
const HYDROPHOBIC = new Set(["ALA", "VAL", "LEU", "ILE", "MET", "PHE", "TRP", "PRO", "CYS", "TYR"]);
const CHARGED = new Set(["ASP", "GLU", "LYS", "ARG", "HIS"]);
const AROMATIC = new Set(["PHE", "TYR", "TRP", "HIS"]);
const ONE = { ALA: "A", ARG: "R", ASN: "N", ASP: "D", CYS: "C", GLN: "Q", GLU: "E", GLY: "G", HIS: "H", ILE: "I", LEU: "L", LYS: "K", MET: "M", PHE: "F", PRO: "P", SER: "S", THR: "T", TRP: "W", TYR: "Y", VAL: "V" };

export const isHydrophobic = (resn) => HYDROPHOBIC.has(resn);
export const oneLetter = (resn) => ONE[resn] || resn;
export const chainColor = (chains, c) => CHAIN_COLORS[Math.max(0, chains.indexOf(c)) % CHAIN_COLORS.length];

const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;

export function findLigands(atoms) {
  const map = new Map();
  for (const a of atoms) {
    if (!a.hetflag || SOLVENT.has(a.resn) || a.elem === "H") continue;
    const k = `${a.chain}:${a.resn}:${a.resi}`;
    if (!map.has(k)) map.set(k, { key: k, chain: a.chain, resn: a.resn, resi: a.resi, atoms: [] });
    map.get(k).atoms.push(a);
  }
  return [...map.values()].filter((l) => l.atoms.length >= 6).sort((a, b) => b.atoms.length - a.atoms.length);
}

const polar = (a) => a.elem === "N" || a.elem === "O";

export function findContacts(atoms, lig, cutoff = 4.5) {
  const cut2 = cutoff * cutoff;
  const byRes = new Map();
  for (const a of atoms) {
    if (a.hetflag || a.elem === "H") continue;
    for (const l of lig.atoms) {
      const dd = d2(a, l);
      if (dd > cut2) continue;
      const k = `${a.chain}:${a.resi}`;
      if (!byRes.has(k)) byRes.set(k, { key: k, chain: a.chain, resi: a.resi, resn: a.resn, best: { dist: 99 }, ints: {} });
      const r = byRes.get(k);
      const dist = Math.sqrt(dd);
      let type = "contact";
      if (polar(a) && polar(l) && dist <= 3.5) type = "hbond";
      else if (CHARGED.has(a.resn) && polar(l) && dist <= 4.0) type = "ionic";
      else if (AROMATIC.has(a.resn) && l.elem === "C" && a.elem === "C" && dist <= 4.2) type = "pi";
      else if (a.elem === "C" && l.elem === "C" && dist <= 4.2) type = "hydrophobic";
      const prev = r.ints[type];
      if (!prev || dist < prev.dist) r.ints[type] = { dist, la: l, ra: a };
      if (dist < r.best.dist) r.best = { dist, la: l, ra: a };
    }
  }
  const order = ["hbond", "ionic", "pi", "hydrophobic", "contact"];
  const out = [];
  for (const r of byRes.values()) {
    const type = order.find((t) => r.ints[t]);
    const it = r.ints[type];
    const ca = atoms.find((a) => a.chain === r.chain && a.resi === r.resi && a.atom === "CA") || it.ra;
    out.push({ key: r.key, chain: r.chain, resi: r.resi, resn: r.resn, type, dist: it.dist, la: it.la, ra: it.ra, ca });
  }
  return out.sort((a, b) => (a.chain === b.chain ? a.resi - b.resi : a.chain < b.chain ? -1 : 1));
}

// --- 2D contact map -------------------------------------------------------------------
const TYPE_STYLE = {
  hbond: { color: "#1DB87A", dash: "6 4", label: "Hydrogen bond" },
  ionic: { color: "#E5742A", dash: "6 4", label: "Polar / ionic" },
  pi: { color: "#7A4FE0", dash: "2 3", label: "Aromatic (π)" },
  hydrophobic: { color: "#8C929C", dash: "1 4", label: "Hydrophobic" },
  contact: { color: "#B8BCC4", dash: "1 4", label: "Other contact" },
};
const ELEM_COLOR = { N: "#2A5BD7", O: "#D9302A", S: "#B8860B", Cl: "#1F9A5A", CL: "#1F9A5A", F: "#1F9A5A", Br: "#8B4513", BR: "#8B4513", P: "#C26A00" };

function axes(vecs) {
  // top-2 principal axes of 3D vectors (power iteration)
  const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const v of vecs) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += v[i] * v[j];
  const mul = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
  let e1 = norm([1, 0.3, 0.2]);
  for (let i = 0; i < 40; i++) e1 = norm(mul(cov, e1));
  let e2 = norm([0.2, 1, 0.3]);
  for (let i = 0; i < 40; i++) {
    e2 = mul(cov, e2);
    const dot = e2[0] * e1[0] + e2[1] * e1[1] + e2[2] * e1[2];
    e2 = norm(e2.map((x, k) => x - dot * e1[k]));
  }
  return [e1, e2];
}

export function contactMapSVG(lig, contacts, chains, title = "", l2d = null, allAtoms = [], opts = {}) {
  const only = !!opts.ligandOnly;
  if (only) contacts = [];
  const na = lig.atoms.length;
  let pos2, bonds;
  if (l2d) { pos2 = l2d.pos.map(([x, y]) => [x, -y]); bonds = l2d.bonds; }
  else {
    const c = lig.atoms.reduce((s, a) => [s[0] + a.x / na, s[1] + a.y / na, s[2] + a.z / na], [0, 0, 0]);
    const rel = (a) => [a.x - c[0], a.y - c[1], a.z - c[2]];
    const [e1, e2] = axes(contacts.map((r) => rel(r.ca)).concat(lig.atoms.map(rel)));
    pos2 = lig.atoms.map((a) => { const v = rel(a); return [v[0] * e1[0] + v[1] * e1[1] + v[2] * e1[2], v[0] * e2[0] + v[1] * e2[1] + v[2] * e2[2]]; });
    bonds = [];
    for (let i = 0; i < na; i++) for (let j = i + 1; j < na; j++) if (d2(lig.atoms[i], lig.atoms[j]) < 1.9 ** 2) bonds.push([i, j, 1]);
  }
  const cx = 0, cy = 0;
  const mx = pos2.reduce((s, p) => s + p[0], 0) / na, my = pos2.reduce((s, p) => s + p[1], 0) / na;
  const ext = Math.max(1, ...pos2.map((p) => Math.hypot(p[0] - mx, p[1] - my)));
  const sc = only ? Math.min(52, 190 / ext) : Math.min(46, 120 / ext);
  const LP = pos2.map((p) => [(p[0] - mx) * sc, (p[1] - my) * sc]);

  // residues sit just outside the ligand atom they touch, then are relaxed apart
  const n = contacts.length;
  const anchor = contacts.map((r) => Math.max(0, lig.atoms.indexOf(r.la)));
  const want = contacts.map((r, i) => {
    const a = LP[anchor[i]]; let dx = a[0] - cx, dy = a[1] - cy; let L = Math.hypot(dx, dy);
    if (L < 8) { const t = (i / Math.max(n, 1)) * Math.PI * 2; dx = Math.cos(t); dy = Math.sin(t); L = 1; }
    const r0 = L + 105 + Math.max(0, r.dist - 2.6) * 18 + (i % 3) * 14;
    return [cx + (dx / L) * r0, cy + (dy / L) * r0];
  });
  const P = want.map((w) => [...w]);
  for (let it = 0; it < 300; it++) {
    for (let i = 0; i < n; i++) {
      P[i][0] += (want[i][0] - P[i][0]) * 0.02; P[i][1] += (want[i][1] - P[i][1]) * 0.02;
      for (let j = i + 1; j < n; j++) {
        const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1]; const L = Math.hypot(dx, dy) || 0.01; const min = 74;
        if (L < min) { const f = ((min - L) / L) * 0.5; P[i][0] -= dx * f; P[i][1] -= dy * f; P[j][0] += dx * f; P[j][1] += dy * f; }
      }
      for (const q of LP) { const dx = P[i][0] - q[0], dy = P[i][1] - q[1]; const L = Math.hypot(dx, dy) || 0.01; if (L < 62) { P[i][0] += (dx / L) * (62 - L); P[i][1] += (dy / L) * (62 - L); } }
    }
  }

  const prot = allAtoms.filter((a) => !a.hetflag);
  const exposed = lig.atoms.map((a) => prot.reduce((c, p) => c + (d2(a, p) < 4.5 * 4.5 ? 1 : 0), 0) < 4);

  const body = [];
  lig.atoms.forEach((a, i) => { if (exposed[i] && !only) body.push(`<circle cx="${LP[i][0].toFixed(1)}" cy="${LP[i][1].toFixed(1)}" r="26" fill="url(#gl)"/>`); });
  contacts.forEach((r, i) => {
    const st = TYPE_STYLE[r.type]; const [x1, y1] = LP[anchor[i]]; const [x, y] = P[i];
    body.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${st.color}" stroke-width="1.8" stroke-dasharray="${st.dash}" stroke-linecap="round"/>`);
    const mx2 = x1 + (x - x1) * 0.55, my2 = y1 + (y - y1) * 0.55;
    body.push(`<rect x="${(mx2 - 17).toFixed(1)}" y="${(my2 - 8).toFixed(1)}" width="34" height="16" rx="8" fill="#fff" stroke="${st.color}" stroke-width="1"/><text x="${mx2.toFixed(1)}" y="${(my2 + 4).toFixed(1)}" font-size="10.5" text-anchor="middle" fill="#222">${r.dist.toFixed(1)}</text>`);
  });
  body.push('<g stroke="#111" stroke-width="1.9" stroke-linecap="round">');
  bonds.forEach(([i, j, ord]) => {
    const [x1, y1] = LP[i], [x2, y2] = LP[j]; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1; const nx = (-dy / L) * 2.6, ny = (dx / L) * 2.6;
    const ln = (ox, oy) => body.push(`<line x1="${(x1 + ox).toFixed(1)}" y1="${(y1 + oy).toFixed(1)}" x2="${(x2 + ox).toFixed(1)}" y2="${(y2 + oy).toFixed(1)}"/>`);
    if (ord === 2) { ln(nx, ny); ln(-nx, -ny); } else if (ord === 3) { ln(0, 0); ln(nx * 1.6, ny * 1.6); ln(-nx * 1.6, -ny * 1.6); } else ln(0, 0);
  });
  body.push("</g>");
  lig.atoms.forEach((a, i) => {
    const col = ELEM_COLOR[a.elem]; if (!col) return;
    body.push(`<circle cx="${LP[i][0].toFixed(1)}" cy="${LP[i][1].toFixed(1)}" r="9" fill="#fff"/><text x="${LP[i][0].toFixed(1)}" y="${(LP[i][1] + 4.6).toFixed(1)}" font-size="13" font-weight="700" text-anchor="middle" fill="${col}">${a.elem}</text>`);
  });
  contacts.forEach((r, i) => {
    const [x, y] = P[i]; const col = chainColor(chains, r.chain); const right = x >= cx;
    body.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${col}" stroke="#fff" stroke-width="1.5"/>`);
    body.push(`<text x="${(x + (right ? 13 : -13)).toFixed(1)}" y="${(y + 5).toFixed(1)}" font-size="16" font-weight="${r.type === "hbond" ? 700 : 500}" text-anchor="${right ? "start" : "end"}" fill="#222">${r.resn}${r.resi}<tspan font-size="11" fill="#777"> ${r.chain}</tspan></text>`);
  });

  // bounding box of everything drawn
  let x0 = Infinity, y0 = Infinity, x1b = -Infinity, y1b = -Infinity;
  LP.forEach(([x, y]) => { x0 = Math.min(x0, x - 22); x1b = Math.max(x1b, x + 22); y0 = Math.min(y0, y - 22); y1b = Math.max(y1b, y + 22); });
  contacts.forEach((r, i) => { const [x, y] = P[i]; const w = 62 + 11 * (`${r.resn}${r.resi}`.length); const right = x >= cx; x0 = Math.min(x0, right ? x - 10 : x - w); x1b = Math.max(x1b, right ? x + w : x + 10); y0 = Math.min(y0, y - 14); y1b = Math.max(y1b, y + 14); });
  const pad = 36, titleH = title ? 34 : 0;
  const types = [...new Set(contacts.map((r) => r.type))];
  const items = only ? 0 : types.length + chains.length + 1;
  const legH = only ? 0 : 24 + Math.ceil(items / 3) * 22;
  const W = Math.max(x1b - x0 + pad * 2, only ? 380 : 660), contentH = y1b - y0 + pad * 2;
  const H = titleH + contentH + (legH ? legH + 24 : 0);
  const dx = (W - (x1b - x0)) / 2 - x0, dy = titleH + pad - y0;

  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="${W.toFixed(0)}" height="${H.toFixed(0)}" font-family="Helvetica, Arial, sans-serif">`);
  o.push('<defs><radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#4DA3FF" stop-opacity=".75"/><stop offset="1" stop-color="#4DA3FF" stop-opacity="0"/></radialGradient></defs>');
  if (title) o.push(`<text x="${(W / 2).toFixed(0)}" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="#222">${title}</text>`);
  o.push(`<g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)})">`, ...body, "</g>");
  if (legH) {
    const lw = Math.min(620, W - 40); const lx = (W - lw) / 2, ly = H - legH - 14;
    o.push(`<g transform="translate(${lx.toFixed(0)} ${ly.toFixed(0)})"><rect width="${lw}" height="${legH}" rx="4" fill="#fff" stroke="#111" stroke-width="1" stroke-dasharray="5 4"/>`);
    let k = 0; const col3 = lw / 3;
    const pt = () => ({ x: 20 + (k % 3) * col3, y: 26 + Math.floor(k++ / 3) * 22 });
    types.forEach((t) => { const st = TYPE_STYLE[t]; const { x, y } = pt();
      o.push(`<line x1="${x}" y1="${y - 4}" x2="${x + 30}" y2="${y - 4}" stroke="${st.color}" stroke-width="2" stroke-dasharray="${st.dash}"/><text x="${x + 38}" y="${y}" font-size="12" fill="#222">${st.label}</text>`); });
    { const { x, y } = pt(); o.push(`<circle cx="${x + 15}" cy="${y - 4}" r="11" fill="url(#gl)"/><text x="${x + 38}" y="${y}" font-size="12" fill="#222">Solvent exposed</text>`); }
    chains.forEach((ch) => { const { x, y } = pt();
      o.push(`<circle cx="${x + 15}" cy="${y - 4}" r="5" fill="${chainColor(chains, ch)}"/><text x="${x + 38}" y="${y}" font-size="12" fill="#222">Chain ${ch}</text>`); });
    o.push("</g>");
  }
  o.push("</svg>");
  return o.join("\n");
}

// --- Illust (ChimeraX-like outline) on a canvas ---------------------------------------
export function illustize(src, { radius = 3, bands = 5, color = "#17181A", flat = true } = {}) {
  const w = src.width, h = src.height;
  const flatC = document.createElement("canvas"); flatC.width = w; flatC.height = h;
  const fx = flatC.getContext("2d"); fx.drawImage(src, 0, 0);
  if (flat) {
    const img = fx.getImageData(0, 0, w, h); const d = img.data;
    const lv = Array.from({ length: bands }, (_, i) => 0.18 + (0.82 * i) / (bands - 1));
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      for (let c = 0; c < 3; c++) d[i + c] = lv[Math.min(bands - 1, Math.floor((d[i + c] / 255) * bands))] * 255;
    }
    fx.putImageData(img, 0, 0);
  }
  const ink = document.createElement("canvas"); ink.width = w; ink.height = h;
  const ix = ink.getContext("2d"); ix.drawImage(src, 0, 0); ix.globalCompositeOperation = "source-in"; ix.fillStyle = color; ix.fillRect(0, 0, w, h);
  const out = document.createElement("canvas"); out.width = w; out.height = h;
  const ox = out.getContext("2d");
  for (const r of [radius, radius * 0.6]) for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2; ox.drawImage(ink, Math.cos(a) * r, Math.sin(a) * r); }
  ox.drawImage(flatC, 0, 0);
  return out;
}
