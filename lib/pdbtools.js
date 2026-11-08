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

export function contactMapSVG(lig, contacts, chains, title = "") {
  const W = 760, H = 860, cx = 380, cy = 380;
  const c = lig.atoms.reduce((s, a) => [s[0] + a.x / lig.atoms.length, s[1] + a.y / lig.atoms.length, s[2] + a.z / lig.atoms.length], [0, 0, 0]);
  const rel = (a) => [a.x - c[0], a.y - c[1], a.z - c[2]];
  const vecs = contacts.map((r) => rel(r.ca)).concat(lig.atoms.map(rel));
  const [e1, e2] = axes(vecs.length ? vecs : [[1, 0, 0], [0, 1, 0]]);
  const proj = (v) => [v[0] * e1[0] + v[1] * e1[1] + v[2] * e1[2], v[0] * e2[0] + v[1] * e2[1] + v[2] * e2[2]];
  const lp = lig.atoms.map((a) => proj(rel(a)));
  const ext = Math.max(1, ...lp.map((p) => Math.hypot(p[0], p[1])));
  const sc = 105 / ext;
  const P = (a) => { const p = proj(rel(a)); return [cx + p[0] * sc, cy + p[1] * sc]; };

  // residue ring positions
  const n = contacts.length;
  const ang = contacts.map((r) => { const p = proj(rel(r.ca)); return Math.atan2(p[1], p[0]); });
  const idx = ang.map((a, i) => i).sort((a, b) => ang[a] - ang[b]);
  let sx = 0, sy = 0;
  idx.forEach((ci, k) => { const t = ang[ci] - (2 * Math.PI * k) / n; sx += Math.cos(t); sy += Math.sin(t); });
  const base = Math.atan2(sy, sx);
  const pos = new Array(n);
  idx.forEach((ci, k) => {
    const a = base + (2 * Math.PI * k) / n;
    pos[ci] = [cx + 285 * Math.cos(a), cy + 270 * Math.sin(a), a];
  });

  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Helvetica, Arial, sans-serif">`);
  // pocket outline
  o.push(`<ellipse cx="${cx}" cy="${cy}" rx="215" ry="200" fill="none" stroke="#111" stroke-width="1.2" stroke-dasharray="3 5" opacity=".55"/>`);
  // lines
  contacts.forEach((r, i) => {
    const st = TYPE_STYLE[r.type]; const [x1, y1] = P(r.la); const [x, y] = pos[i];
    o.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${st.color}" stroke-width="1.8" stroke-dasharray="${st.dash}" stroke-linecap="round"/>`);
    const mx = x1 + (x - x1) * 0.55, my = y1 + (y - y1) * 0.55;
    o.push(`<rect x="${(mx - 17).toFixed(1)}" y="${(my - 8).toFixed(1)}" width="34" height="16" rx="8" fill="#fff" stroke="${st.color}" stroke-width="1"/><text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" font-size="10.5" text-anchor="middle" fill="#222">${r.dist.toFixed(1)}</text>`);
  });
  // ligand skeleton
  const bonds = [];
  for (let i = 0; i < lig.atoms.length; i++) for (let j = i + 1; j < lig.atoms.length; j++) if (d2(lig.atoms[i], lig.atoms[j]) < 1.9 ** 2) bonds.push([i, j]);
  const LP = lig.atoms.map(P);
  o.push('<g stroke="#111" stroke-width="2" stroke-linecap="round">');
  bonds.forEach(([i, j]) => o.push(`<line x1="${LP[i][0].toFixed(1)}" y1="${LP[i][1].toFixed(1)}" x2="${LP[j][0].toFixed(1)}" y2="${LP[j][1].toFixed(1)}"/>`));
  o.push("</g>");
  lig.atoms.forEach((a, i) => {
    const col = ELEM_COLOR[a.elem];
    if (!col) return;
    o.push(`<circle cx="${LP[i][0].toFixed(1)}" cy="${LP[i][1].toFixed(1)}" r="8" fill="#fff"/><text x="${LP[i][0].toFixed(1)}" y="${(LP[i][1] + 4.5).toFixed(1)}" font-size="12.5" font-weight="700" text-anchor="middle" fill="${col}">${a.elem}</text>`);
  });
  // residue nodes
  contacts.forEach((r, i) => {
    const [x, y, a] = pos[i]; const col = chainColor(chains, r.chain);
    const right = Math.cos(a) >= 0;
    o.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${col}" stroke="#fff" stroke-width="1.5"/>`);
    o.push(`<text x="${(x + (right ? 13 : -13)).toFixed(1)}" y="${(y + 5).toFixed(1)}" font-size="16" font-weight="${r.type === "hbond" ? 700 : 500}" text-anchor="${right ? "start" : "end"}" fill="#222">${r.resn}${r.resi}<tspan font-size="11" fill="#777"> ${r.chain}</tspan></text>`);
  });
  // legend
  const types = [...new Set(contacts.map((r) => r.type))];
  o.push(`<g transform="translate(70 765)"><rect width="620" height="${40 + Math.ceil((types.length + chains.length) / 3) * 22}" rx="4" fill="#fff" stroke="#111" stroke-width="1" stroke-dasharray="5 4"/>`);
  let k = 0;
  types.forEach((t) => { const st = TYPE_STYLE[t]; const x = 20 + (k % 3) * 200, y = 26 + Math.floor(k / 3) * 22; k++;
    o.push(`<line x1="${x}" y1="${y - 4}" x2="${x + 30}" y2="${y - 4}" stroke="${st.color}" stroke-width="2" stroke-dasharray="${st.dash}"/><text x="${x + 38}" y="${y}" font-size="12" fill="#222">${st.label}</text>`); });
  chains.forEach((ch) => { const x = 20 + (k % 3) * 200, y = 26 + Math.floor(k / 3) * 22; k++;
    o.push(`<circle cx="${x + 8}" cy="${y - 4}" r="5" fill="${chainColor(chains, ch)}"/><text x="${x + 38}" y="${y}" font-size="12" fill="#222">Chain ${ch}</text>`); });
  o.push("</g>");
  if (title) o.push(`<text x="${cx}" y="26" font-size="15" font-weight="700" text-anchor="middle" fill="#222">${title}</text>`);
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
