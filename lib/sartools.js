// Series core (MCS), R-group decomposition, activity conversion, activity cliffs and highlighted depictions.
export const ACT_MODES = [
  ["p", "pIC50 / pKi (higher is better)"],
  ["nM", "IC50 / Ki in nM"],
  ["uM", "IC50 / Ki in µM"],
  ["raw", "Other value (higher is better)"],
];

export function numOf(v) {
  if (v == null) return NaN; const s = String(v).trim().replace(/^[<>~≈=≥≤]+\s*/, "").replace(/,/g, "");
  if (!s || !/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return NaN; return parseFloat(s);
}
export function numericColumns(mols) {
  const cols = new Map();
  mols.forEach((m) => Object.entries(m.extra || {}).forEach(([k, v]) => { const c = cols.get(k) || { n: 0, ok: 0 }; if (String(v).trim()) { c.n++; if (Number.isFinite(numOf(v))) c.ok++; } cols.set(k, c); }));
  return [...cols].filter(([, c]) => c.ok >= 3 && c.ok >= 0.6 * c.n).map(([k]) => k);
}
export function guessMode(col) {
  const c = col.toLowerCase();
  if (/^p(ic50|ki|kd|ec50|activity)|pic50|pki|pec50/.test(c)) return "p";
  if (/nm\b|\(nm\)|_nm/.test(c)) return "nM";
  if (/um\b|µm|\(um\)|_um/.test(c)) return "uM";
  if (/ic50|ki\b|kd\b|ec50|potency/.test(c)) return "nM";
  return "raw";
}
export function guessColumn(cols) {
  return cols.find((c) => /ic50|ki\b|kd\b|ec50|pic50|pki|activity|potency|inhib/i.test(c)) || "";
}
export function activityArray(mols, col, mode) {
  return Float64Array.from(mols, (m) => {
    const v = numOf(m.extra?.[col]); if (!Number.isFinite(v)) return NaN;
    if (mode === "p" || mode === "raw") return v;
    if (v <= 0) return NaN; return mode === "nM" ? 9 - Math.log10(v) : 6 - Math.log10(v);
  });
}

export function activityCliffs(S, n, act, minSim, minDelta, max = 60) {
  const out = [];
  for (let i = 0; i < n; i++) { if (!Number.isFinite(act[i])) continue; for (let j = i + 1; j < n; j++) {
    if (!Number.isFinite(act[j])) continue; const s = S[i * n + j]; if (s < minSim) continue;
    const d = Math.abs(act[i] - act[j]); if (d >= minDelta) out.push({ i, j, sim: s, delta: d, score: d * s });
  } }
  out.sort((a, b) => b.score - a.score); return out.slice(0, max);
}

const del = (o) => { try { o?.delete?.(); } catch {} };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

// MCS core of a set of members + R-group decomposition. Returns null if there is no usable core.
export function analyzeCluster(rd, mols, members, act) {
  const use = members.slice(0, 60);
  const objs = use.map((i) => rd.get_mol(mols[i].smiles));
  let smarts = "";
  const ml = new rd.MolList(); objs.forEach((o) => ml.append(o));
  try { smarts = rd.get_mcs_as_smarts(ml, JSON.stringify({ RingMatchesRingOnly: true, CompleteRingsOnly: true, Timeout: 3 })); } catch { smarts = ""; }
  del(ml);
  const nCore = (smarts.match(/\[#/g) || []).length;
  if (nCore < 5) { objs.forEach(del); return { smarts: "", members: use, note: "These molecules share no common core of at least 5 atoms." }; }
  const res = { smarts, nCore, members: use, positions: [], rows: [], coreSmiles: "" };
  const core = rd.get_qmol(smarts);
  try {
    const rg = rd.get_rgd(core, JSON.stringify({}));
    const idx = new Map();
    objs.forEach((o, k) => { const r = rg.add(o); if (typeof r === "number" ? r >= 0 : r) idx.set(typeof r === "number" ? r : idx.size, use[k]); });
    rg.process();
    const rows = rg.get_rgroups_as_rows();
    rows.forEach((r, k) => {
      const keys = Object.keys(r); const row = { i: idx.get(k) ?? use[k], r: {} };
      keys.forEach((key) => { const v = r[key]; const smi = v && v.get_smiles ? v.get_smiles() : ""; if (key === "Core") { if (!res.coreSmiles) res.coreSmiles = smi; } else row.r[key] = smi; del(v); });
      res.rows.push(row);
    });
    res.positions = [...new Set(res.rows.flatMap((r) => Object.keys(r.r)))].sort();
    del(rg);
  } catch (e) { res.note = "R-group decomposition failed for this cluster."; }
  del(core); objs.forEach(del);
  const clean = (s) => (/^\[H\]\[\*:\d+\]$/.test(s) || !s ? "H" : s.replace(/\[\*:\d+\]/g, "*"));
  res.rows.forEach((r) => { for (const k of Object.keys(r.r)) r.r[k] = clean(r.r[k]); });
  // substituent effect per position (needs activity)
  res.effects = {};
  if (act) {
    const vals = res.rows.map((r) => act[r.i]).filter(Number.isFinite); const gm = vals.length ? mean(vals) : NaN; res.meanAct = gm;
    for (const pos of res.positions) {
      const g = new Map();
      res.rows.forEach((r) => { const a = act[r.i]; if (!Number.isFinite(a)) return; const k = r.r[pos] ?? "H"; (g.get(k) || g.set(k, []).get(k)).push(a); });
      if (g.size < 2) continue;
      res.effects[pos] = [...g].map(([smi, a]) => ({ smi, n: a.length, mean: mean(a), delta: mean(a) - gm })).sort((x, y) => y.mean - x.mean);
    }
  }
  return res;
}

// Depiction with the common part in blue-grey and the differing atoms in orange.
export function drawHighlighted(rd, smiles, w, h, smarts) {
  const m = rd.get_mol(smiles); if (!m || !m.is_valid()) { del(m); return ""; }
  let svg = "";
  try {
    try { m.set_new_coords(); } catch {}
    let core = new Set(); let qm = null;
    if (smarts) { qm = rd.get_qmol(smarts); const mt = JSON.parse(m.get_substruct_match(qm)); (mt.atoms || []).forEach((a) => core.add(a)); }
    if (!core.size) { svg = m.get_svg(w, h); }
    else {
      const js = JSON.parse(m.get_json()); const mm = js.molecules[0]; const nA = mm.atoms.length;
      const BL = [0.74, 0.82, 0.93], OR = [1, 0.66, 0.2];
      const ac = {}, bc = {}; const atoms = [], bonds = [];
      for (let a = 0; a < nA; a++) { atoms.push(a); ac[a] = core.has(a) ? BL : OR; }
      mm.bonds.forEach((b, k) => { const [x, y] = b.atoms; bonds.push(k); bc[k] = core.has(x) && core.has(y) ? BL : OR; });
      svg = m.get_svg_with_highlights(JSON.stringify({ width: w, height: h, atoms, bonds, highlightAtomColors: ac, highlightBondColors: bc, highlightRadius: 0.32, fillHighlights: true }));
    }
    del(qm);
  } catch { try { svg = m.get_svg(w, h); } catch { svg = ""; } }
  del(m); return svg;
}
export function drawPlain(rd, smiles, w, h) {
  const m = rd.get_mol(smiles); if (!m || !m.is_valid()) { del(m); return ""; } const s = m.get_svg(w, h); del(m); return s;
}
export function pairCore(rd, a, b) {
  const x = rd.get_mol(a), y = rd.get_mol(b); const ml = new rd.MolList(); ml.append(x); ml.append(y);
  let s = ""; try { s = rd.get_mcs_as_smarts(ml, JSON.stringify({ RingMatchesRingOnly: true, CompleteRingsOnly: true, Timeout: 2 })); } catch {}
  del(ml); del(x); del(y); return s;
}
