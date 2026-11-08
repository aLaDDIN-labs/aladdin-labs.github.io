// Protein sequence calculations used by the Seq / conc tool. All formulas are the standard textbook ones.
export const AA = "ACDEFGHIKLMNPQRSTVWY";
const MASS = { G: 57.0519, A: 71.0788, S: 87.0782, P: 97.1167, V: 99.1326, T: 101.1051, C: 103.1388, L: 113.1594, I: 113.1594, N: 114.1038, D: 115.0886, Q: 128.1307, K: 128.1741, E: 129.1155, M: 131.1926, H: 137.1411, F: 147.1766, R: 156.1875, Y: 163.176, W: 186.2132 };
const WATER = 18.01524;
const KD = { A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, Q: -3.5, E: -3.5, G: -0.4, H: -3.2, I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2 };
const PKA = { nt: 8.6, ct: 3.6, K: 10.8, R: 12.5, H: 6.5, D: 3.9, E: 4.1, C: 8.5, Y: 10.1 }; // EMBOSS set

export function parseSequence(text) {
  let t = (text || "").replace(/^>.*$/gm, "").toUpperCase().replace(/[\s\d*\-]/g, "");
  const bad = [...new Set(t.replace(/[ACDEFGHIKLMNPQRSTVWY]/g, ""))];
  return { seq: t.replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, ""), ignored: bad };
}

export function count(seq) { const c = Object.fromEntries([...AA].map((a) => [a, 0])); for (const a of seq) c[a]++; return c; }

export function charge(c, pH) {
  const pos = (pka) => 1 / (1 + 10 ** (pH - pka)), neg = (pka) => 1 / (1 + 10 ** (pka - pH));
  return pos(PKA.nt) + c.K * pos(PKA.K) + c.R * pos(PKA.R) + c.H * pos(PKA.H) - neg(PKA.ct) - c.D * neg(PKA.D) - c.E * neg(PKA.E) - c.C * neg(PKA.C) - c.Y * neg(PKA.Y);
}
export function pI(c) { let lo = 0, hi = 14; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (charge(c, m) > 0) lo = m; else hi = m; } return (lo + hi) / 2; }

export function analyze(seq) {
  const n = seq.length; if (!n) return null;
  const c = count(seq);
  const mw = [...seq].reduce((s, a) => s + MASS[a], WATER);
  const eRed = c.W * 5500 + c.Y * 1490, eOx = eRed + Math.floor(c.C / 2) * 125;
  const gravy = [...seq].reduce((s, a) => s + KD[a], 0) / n;
  const ali = ((c.A + 2.9 * c.V + 3.9 * (c.I + c.L)) / n) * 100;
  return {
    n, c, mw, eRed, eOx, gravy, ali, pi: pI(c),
    a280Ox: eOx / mw, a280Red: eRed / mw,
    pos: c.K + c.R, neg: c.D + c.E,
    hydrophobicPct: ((c.A + c.V + c.I + c.L + c.M + c.F + c.W + c.P) / n) * 100,
  };
}

export const TAGS = [
  { name: "His-tag", re: /H{6,}/g },
  { name: "Strep-tag II", re: /WSHPQFEK/g },
  { name: "FLAG", re: /DYKDDDDK/g },
  { name: "HA", re: /YPYDVPDYA/g },
  { name: "Myc", re: /EQKLISEEDL/g },
  { name: "V5", re: /GKPIPNPLLGLDST/g },
  { name: "Avi-tag", re: /GLNDIFEAQKIEWHE/g },
  { name: "S-tag", re: /KETAAAKFERQHMDS/g },
];
export const PROTEASES = [
  { name: "TEV", site: "ENLYFQ", re: /ENLYFQ(?=[GSAMHN])/g, cut: 6, note: "cuts after Q (ENLYFQ↓G/S)" },
  { name: "Thrombin", site: "LVPR", re: /LVPR(?=GS)/g, cut: 4, note: "cuts after R (LVPR↓GS)" },
  { name: "PreScission / 3C", site: "LEVLFQ", re: /LEVLFQ(?=GP)/g, cut: 6, note: "cuts after Q (LEVLFQ↓GP)" },
  { name: "Enterokinase", site: "DDDDK", re: /DDDDK/g, cut: 5, note: "cuts after K (DDDDK↓)" },
  { name: "Factor Xa", site: "IEGR / IDGR", re: /I[ED]GR/g, cut: 4, note: "cuts after R (I[E/D]GR↓)" },
];
export function findMotifs(seq, list) {
  const out = [];
  for (const m of list) { m.re.lastIndex = 0; let x; while ((x = m.re.exec(seq))) { out.push({ ...m, start: x.index + 1, end: x.index + x[0].length, hit: x[0] }); if (x.index === m.re.lastIndex) m.re.lastIndex++; } }
  return out.sort((a, b) => a.start - b.start);
}

export const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 }) : "–");
export const EGFP = "MVSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTLTYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK";

// ---- hydropathy stretches, cysteines ---------------------------------------------------
const KDm = { A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, Q: -3.5, E: -3.5, G: -0.4, H: -3.2, I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2 };
export function hydropathy(seq, win = 9) {
  const h = Math.floor(win / 2), out = [];
  for (let i = h; i < seq.length - h; i++) { let s = 0; for (let j = i - h; j <= i + h; j++) s += KDm[seq[j]]; out.push([i + 1, s / win]); }
  return out;
}
export function stretches(seq, win, thr, minLen = 1) {
  const p = hydropathy(seq, win), h = Math.floor(win / 2), res = []; let cur = null;
  for (const [pos, v] of p) {
    if (v >= thr) { if (!cur) cur = { start: pos - h, end: pos + h, max: v }; else { cur.end = pos + h; cur.max = Math.max(cur.max, v); } }
    else if (cur) { res.push(cur); cur = null; }
  }
  if (cur) res.push(cur);
  return res.filter((r) => r.end - r.start + 1 >= minLen);
}
export function cysPositions(seq) { const o = []; for (let i = 0; i < seq.length; i++) if (seq[i] === "C") o.push(i + 1); return o; }

// ---- codon usage (per thousand, TCAG order; approximate Kazusa-style values) -----------
const AAS = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
const CODONS = []; for (const a of "TCAG") for (const b of "TCAG") for (const c of "TCAG") CODONS.push(a + b + c);
const toTable = (arr) => Object.fromEntries(CODONS.map((c, i) => [c, arr[i]]));
export const HOSTS = {
  ecoli: { name: "E. coli (K-12)", f: toTable([22.4, 16.6, 13.9, 13.7, 8.5, 8.6, 7.2, 8.9, 16.2, 12.2, 2.0, 0.2, 5.2, 6.5, 1.0, 15.3, 11.0, 11.0, 3.9, 52.8, 7.0, 5.5, 8.4, 23.2, 12.9, 9.7, 15.4, 28.9, 20.9, 22.0, 3.6, 5.4, 30.4, 25.0, 4.4, 27.8, 8.9, 23.4, 7.1, 14.4, 17.7, 21.6, 33.6, 10.3, 8.8, 16.0, 2.1, 1.2, 18.3, 15.3, 10.9, 26.3, 15.3, 25.5, 20.3, 33.6, 32.2, 19.1, 39.5, 17.8, 24.7, 29.6, 8.0, 11.1]) },
  yeast: { name: "S. cerevisiae", f: toTable([26.1, 18.4, 26.2, 27.2, 23.5, 14.2, 18.7, 8.6, 18.8, 14.8, 1.1, 0.5, 8.1, 4.8, 0.7, 10.4, 12.3, 5.4, 13.4, 10.5, 13.5, 6.8, 18.3, 5.3, 13.6, 7.8, 27.3, 12.1, 6.4, 2.6, 3.0, 1.7, 30.1, 17.2, 17.8, 20.9, 20.3, 12.7, 17.8, 8.0, 35.7, 24.8, 41.9, 30.8, 14.2, 9.8, 21.3, 9.2, 22.1, 11.8, 11.8, 10.8, 21.2, 12.6, 16.2, 6.2, 37.6, 20.2, 45.6, 19.2, 23.9, 9.8, 10.9, 6.0]) },
  human: { name: "Human (HEK293 / CHO-like)", f: toTable([17.6, 20.3, 7.7, 12.9, 15.2, 17.7, 12.2, 4.4, 12.2, 15.3, 1.0, 0.8, 10.6, 12.6, 1.6, 13.2, 13.2, 19.6, 7.2, 39.6, 17.5, 19.8, 16.9, 6.9, 10.9, 15.1, 12.3, 34.2, 4.5, 10.4, 6.2, 11.4, 16.0, 20.8, 7.5, 22.0, 13.1, 18.9, 15.1, 6.1, 17.0, 19.1, 24.4, 31.9, 12.1, 19.5, 12.2, 12.0, 11.0, 14.5, 7.1, 28.1, 18.4, 27.7, 15.8, 7.4, 21.8, 25.1, 29.0, 39.6, 10.8, 22.2, 16.5, 16.5]) },
};
export const ROSETTA = new Set(["AGG", "AGA", "ATA", "CTA", "CCC", "GGA", "CGG"]);
const AA_OF = Object.fromEntries(CODONS.map((c, i) => [c, AAS[i]]));

export function parseDNA(text) { return (text || "").replace(/^>.*$/gm, "").toUpperCase().replace(/U/g, "T").replace(/[^ACGT]/g, ""); }
export function translate(dna) { let p = ""; for (let i = 0; i + 2 < dna.length; i += 3) { const a = AA_OF[dna.slice(i, i + 3)]; if (a === "*") break; p += a; } return p; }

export function codonReport(dna, host, thr = 0.12) {
  const F = HOSTS[host].f, fam = {};
  for (const c of CODONS) { const a = AA_OF[c]; (fam[a] = fam[a] || []).push(c); }
  const rare = [], ws = []; let n = 0;
  for (let i = 0; i + 2 < dna.length; i += 3) {
    const c = dna.slice(i, i + 3), a = AA_OF[c]; if (a === "*") break; n++;
    if (a === "M" || a === "W") continue;
    const tot = fam[a].reduce((s, x) => s + F[x], 0), mx = Math.max(...fam[a].map((x) => F[x]));
    ws.push(Math.log(F[c] / mx));
    if (F[c] / tot < thr) rare.push({ pos: n, codon: c, aa: a, freq: F[c], frac: F[c] / tot });
  }
  const clusters = []; let cur = [];
  for (const r of rare) { if (cur.length && r.pos - cur[cur.length - 1].pos > 5) { if (cur.length > 1) clusters.push(cur); cur = []; } cur.push(r); }
  if (cur.length > 1) clusters.push(cur);
  return { n, rare, clusters, cai: ws.length ? Math.exp(ws.reduce((s, x) => s + x, 0) / ws.length) : NaN, remainder: dna.length % 3 };
}

// ---- size-exclusion calibration -----------------------------------------------------------
export function fitSEC(points, vo, vt) {
  const pts = points.filter((p) => p.mw > 0 && Number.isFinite(p.ve)).map((p) => ({ x: Math.log10(p.mw), y: (p.ve - vo) / (vt - vo) }));
  if (pts.length < 2 || !(vt > vo)) return null;
  const n = pts.length, mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  const sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0), sxy = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0), syy = pts.reduce((s, p) => s + (p.y - my) ** 2, 0);
  if (!sxx) return null;
  const b = sxy / sxx, a = my - b * mx;
  return { a, b, r2: syy ? (sxy * sxy) / (sxx * syy) : 1, n, ve: (mw) => vo + (a + b * Math.log10(mw)) * (vt - vo), mw: (ve) => 10 ** (((ve - vo) / (vt - vo) - a) / b) };
}

// ---- SDS-PAGE schematic ---------------------------------------------------------------------
export const GELS = { "8%": [20, 250], "10%": [14, 200], "12%": [10, 150], "15%": [8, 100], "4-20%": [6, 250] };
export const LADDER = [250, 150, 100, 75, 50, 37, 25, 20, 15, 10];
export function gelY(mwKDa, gel) { const [lo, hi] = GELS[gel]; return (Math.log10(hi) - Math.log10(mwKDa)) / (Math.log10(hi) - Math.log10(lo)); }
