// Library explorer helpers: file parsing, fingerprint similarity, Butina clustering, 2D layouts.
const tick = () => new Promise((r) => setTimeout(r, 0));

// ---- parsing ---------------------------------------------------------------------------
export function parseSDFText(text) {
  const out = [];
  for (const blk of text.replace(/\r/g, "").split(/^\$\$\$\$\s*$/m)) {
    if (!blk.trim()) continue;
    const i = blk.indexOf("M  END"); if (i < 0) continue;
    const molblock = blk.slice(0, i + 6).replace(/^\n+/, "");
    let name = molblock.split("\n")[0].trim();
    const extra = {}; blk.slice(i + 6).replace(/>\s*<([^>]+)>[^\n]*\n([^\n]*)/g, (_, k, v) => { extra[k.trim()] = v.trim(); return ""; });
    if (!name) { const m = blk.match(/>\s*<(?:ID|NAME|Name|Title|Compound_ID|Catalog ?ID)[^>]*>\s*\n([^\n]+)/i); if (m) name = m[1].trim(); }
    out.push({ name, molblock, extra });
  }
  return out;
}

export function splitCSV(text) {
  const t = text.replace(/\r/g, ""); const first = t.split("\n", 1)[0];
  const delim = [["\t", first.split("\t").length], [";", first.split(";").length], [",", first.split(",").length]].sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export function parseTable(text, fileName = "") {
  const rows = splitCSV(text); if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim());
  const looksSmiles = (s) => /^[A-Za-z0-9@+\-\[\]\(\)=#$:\/\\.%*]+$/.test(s) && /[A-Za-z]/.test(s);
  let si = head.findIndex((h) => /^(canonical_?)?smiles$|smiles/i.test(h));
  let hasHeader = si >= 0 || head.some((h) => /^(name|id|compound|mol|title)/i.test(h));
  if (si < 0) { si = head.findIndex((h, i) => looksSmiles(h) && h.length > 3 && /[()=]|c1|C1/.test(h)); if (si >= 0) hasHeader = false; }
  if (si < 0) { // pick the column whose values most look like SMILES
    let best = -1, bs = 0;
    for (let c = 0; c < head.length; c++) { let n = 0; rows.slice(1, 30).forEach((r) => { if (r[c] && looksSmiles(r[c].trim()) && r[c].length > 3) n++; }); if (n > bs) { bs = n; best = c; } }
    si = best;
  }
  if (si < 0) throw new Error("No SMILES column was found. Name the column 'SMILES'.");
  let ni = hasHeader ? head.findIndex((h, i) => i !== si && /^(name|id|compound|mol|title|cmpd|catalog|cid)/i.test(h)) : -1;
  if (ni < 0 && !hasHeader && head.length > 1) ni = si === 0 ? 1 : 0;
  const body = hasHeader ? rows.slice(1) : rows;
  const base = fileName.replace(/\.[^.]+$/, "");
  return body.map((r, k) => { const extra = {}; head.forEach((h, c) => { if (c !== si && c !== ni && h && hasHeader) extra[h] = (r[c] ?? "").trim(); }); return { name: (ni >= 0 && r[ni] ? r[ni].trim() : "") || `${base || "mol"}_${k + 1}`, smiles: (r[si] || "").trim().split(/\s+/)[0], extra }; }).filter((x) => x.smiles);
}

// ---- fingerprints and similarity -----------------------------------------------------------
const pop = (x) => { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; };
export async function similarityMatrix(fp, n, W, onProg) {
  const cnt = new Uint16Array(n); for (let i = 0; i < n; i++) { let c = 0; for (let w = 0; w < W; w++) c += pop(fp[i * W + w]); cnt[i] = c; }
  const S = new Float32Array(n * n);
  for (let i = 0; i < n; i++) {
    S[i * n + i] = 1;
    for (let j = i + 1; j < n; j++) {
      let a = 0; const oi = i * W, oj = j * W;
      for (let w = 0; w < W; w++) a += pop(fp[oi + w] & fp[oj + w]);
      const u = cnt[i] + cnt[j] - a, s = u ? a / u : 0;
      S[i * n + j] = s; S[j * n + i] = s;
    }
    if (i % 60 === 59) { onProg?.(i / n); await tick(); }
  }
  return S;
}

// Butina clustering: centroid = molecule with most neighbours at similarity >= cut.
export function butina(S, n, cut) {
  const nb = new Array(n);
  for (let i = 0; i < n; i++) { const l = []; for (let j = 0; j < n; j++) if (j !== i && S[i * n + j] >= cut) l.push(j); nb[i] = l; }
  const order = [...Array(n).keys()].sort((a, b) => nb[b].length - nb[a].length);
  const cl = new Int32Array(n).fill(-1); const groups = [];
  for (const c of order) {
    if (cl[c] >= 0) continue;
    const g = [c]; cl[c] = groups.length;
    for (const j of nb[c]) if (cl[j] < 0) { cl[j] = groups.length; g.push(j); }
    groups.push(g);
  }
  const idx = groups.map((g, k) => k).sort((a, b) => groups[b].length - groups[a].length);
  const remap = new Int32Array(groups.length); idx.forEach((old, k) => { remap[old] = k; });
  const sorted = idx.map((old) => groups[old]);
  for (let i = 0; i < n; i++) cl[i] = remap[cl[i]];
  return { cluster: cl, groups: sorted };
}

// ---- layouts -----------------------------------------------------------------------------
// Classical MDS on 1 - Tanimoto, refined with a few SMACOF steps.
export async function mdsLayout(S, n, onProg) {
  const D = new Float32Array(n * n); for (let i = 0; i < n * n; i++) { const d = 1 - S[i]; D[i] = d * d; }
  const r = new Float64Array(n); let m = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += D[i * n + j]; r[i] = s / n; m += r[i]; } m /= n;
  const mv = (v) => {
    let sv = 0, rv = 0; for (let j = 0; j < n; j++) { sv += v[j]; rv += r[j] * v[j]; }
    const o = new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = 0; const oi = i * n; for (let j = 0; j < n; j++) s += D[oi + j] * v[j]; o[i] = -0.5 * (s - r[i] * sv - rv + m * sv); }
    return o;
  };
  const vecs = [], vals = [];
  for (let k = 0; k < 2; k++) {
    let v = Float64Array.from({ length: n }, (_, i) => Math.sin(i * 12.9898 + k * 78.233) + 0.1); let lam = 0;
    for (let it = 0; it < 60; it++) {
      for (const u of vecs) { let d = 0; for (let i = 0; i < n; i++) d += u[i] * v[i]; for (let i = 0; i < n; i++) v[i] -= d * u[i]; }
      let nr = 0; for (let i = 0; i < n; i++) nr += v[i] * v[i]; nr = Math.sqrt(nr) || 1; for (let i = 0; i < n; i++) v[i] /= nr;
      const w = mv(v); lam = 0; for (let i = 0; i < n; i++) lam += w[i] * v[i]; v = w;
      if (it % 10 === 9) { onProg?.((k * 60 + it) / 120 * 0.6); await tick(); }
    }
    let nr = 0; for (let i = 0; i < n; i++) nr += v[i] * v[i]; nr = Math.sqrt(nr) || 1; for (let i = 0; i < n; i++) v[i] /= nr;
    vecs.push(v); vals.push(Math.max(lam, 1e-9));
  }
  let X = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) { X[2 * i] = vecs[0][i] * Math.sqrt(vals[0]) + 1e-3 * Math.sin(i * 7.1); X[2 * i + 1] = vecs[1][i] * Math.sqrt(vals[1]) + 1e-3 * Math.cos(i * 5.3); }
  for (let it = 0; it < 40; it++) { // SMACOF (Guttman transform, unit weights)
    const Y = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      let bx = 0, by = 0, bs = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const dx = X[2 * i] - X[2 * j], dy = X[2 * i + 1] - X[2 * j + 1], e = Math.hypot(dx, dy) || 1e-6;
        const b = -(1 - S[i * n + j]) / e; bs += b; bx += b * X[2 * j]; by += b * X[2 * j + 1];
      }
      Y[2 * i] = (bx - bs * X[2 * i]) / n; Y[2 * i + 1] = (by - bs * X[2 * i + 1]) / n;
    }
    X = Y; if (it % 8 === 7) { onProg?.(0.6 + 0.4 * it / 40); await tick(); }
  }
  return Array.from({ length: n }, (_, i) => [X[2 * i], X[2 * i + 1]]);
}

// PCA of standardised property columns.
export function pcaLayout(rows) {
  const n = rows.length, p = rows[0].length;
  const mu = Array(p).fill(0), sd = Array(p).fill(0);
  rows.forEach((r) => r.forEach((v, k) => { mu[k] += v / n; }));
  rows.forEach((r) => r.forEach((v, k) => { sd[k] += (v - mu[k]) ** 2 / n; })); sd.forEach((v, k) => { sd[k] = Math.sqrt(v) || 1; });
  const Z = rows.map((r) => r.map((v, k) => (v - mu[k]) / sd[k]));
  const C = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => Z.reduce((s, z) => s + z[a] * z[b], 0) / n));
  const comps = [];
  for (let c = 0; c < 2; c++) {
    let v = Array.from({ length: p }, (_, i) => 1 + 0.1 * i + c);
    for (let it = 0; it < 200; it++) {
      for (const u of comps) { const d = v.reduce((s, x, i) => s + x * u[i], 0); v = v.map((x, i) => x - d * u[i]); }
      const w = C.map((row) => row.reduce((s, x, i) => s + x * v[i], 0)); const nr = Math.hypot(...w) || 1; v = w.map((x) => x / nr);
    }
    comps.push(v);
  }
  return Z.map((z) => comps.map((u) => z.reduce((s, x, i) => s + x * u[i], 0)));
}

export const toCSV = (rows) => rows.map((r) => r.map((v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n") + "\n";
