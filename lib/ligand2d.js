// Ligand parsing (SDF / MOL / PDBQT), bond estimation, and 2D depiction via RDKit-JS (loaded on demand).
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const RAD = { C: 0.76, N: 0.71, O: 0.66, S: 1.05, P: 1.07, F: 0.57, CL: 1.02, BR: 1.2, I: 1.39, B: 0.84, SE: 1.2 };
const cap = (e) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase();
const rad = (e) => RAD[e.toUpperCase()] ?? 0.8;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

let rdPromise = null;
export function getRDKit() {
  if (rdPromise) return rdPromise;
  rdPromise = new Promise((resolve, reject) => {
    const go = () => window.initRDKitModule({ locateFile: (f) => `${BASE}/rdkit/${f}` }).then(resolve, reject);
    if (window.initRDKitModule) return go();
    const s = document.createElement("script");
    s.src = `${BASE}/rdkit/RDKit_minimal.js`; s.onload = go; s.onerror = () => reject(new Error("RDKit failed to load"));
    document.head.appendChild(s);
  });
  rdPromise.catch(() => { rdPromise = null; });
  return rdPromise;
}

// ---- file parsing ----------------------------------------------------------------------
export function parseSDF(text) {
  const L = text.replace(/\r/g, "").split("\n");
  if (/V3000/.test(L[3] || "")) throw new Error("V3000 molfiles are not supported; please save the ligand as V2000 SDF.");
  const na = parseInt(L[3].slice(0, 3)), nb = parseInt(L[3].slice(3, 6));
  if (!(na > 0)) throw new Error("Could not read the SDF/MOL file.");
  const all = [];
  for (let i = 0; i < na; i++) { const s = L[4 + i]; all.push({ x: +s.slice(0, 10), y: +s.slice(10, 20), z: +s.slice(20, 30), elem: cap(s.slice(31, 34).trim()) }); }
  const keep = [], map = new Map();
  all.forEach((a, i) => { if (a.elem !== "H" && a.elem !== "D") { map.set(i, keep.length); keep.push(a); } });
  const bonds = [];
  for (let i = 0; i < nb; i++) {
    const s = L[4 + na + i]; const a = map.get(parseInt(s.slice(0, 3)) - 1), b = map.get(parseInt(s.slice(3, 6)) - 1);
    let o = parseInt(s.slice(6, 9)); if (o === 4) o = 1;
    if (a !== undefined && b !== undefined) bonds.push([a, b, Math.min(o, 3)]);
  }
  return { atoms: keep, bonds, bondsKnown: true };
}

const AD_ELEM = { A: "C", OA: "O", NA: "N", SA: "S", HD: "H", H: "H" };
export function parsePDBQT(text) {
  const atoms = []; let first = true;
  for (const ln of text.replace(/\r/g, "").split("\n")) {
    if (/^ENDMDL/.test(ln)) break;
    if (!/^(ATOM|HETATM)/.test(ln)) continue;
    const t = ln.slice(77).trim() || ln.slice(12, 16).trim().replace(/[0-9]/g, "");
    let e = AD_ELEM[t] || cap(t.replace(/[^A-Za-z]/g, "")) || "C";
    if (e === "H") continue;
    atoms.push({ x: +ln.slice(30, 38), y: +ln.slice(38, 46), z: +ln.slice(46, 54), elem: e });
  }
  if (!atoms.length) throw new Error("No atoms found in the PDBQT file.");
  return { atoms, bonds: null, bondsKnown: false };
}
export const isLigandPDBQT = (t) => /\b(ROOT|TORSDOF|BRANCH)\b/.test(t);

export function toPDBLines(info, resn, chain = "L", resi = 1, start = 1) {
  return info.atoms.map((a, i) => {
    const nm = `${a.elem}${i + 1}`.slice(0, 4);
    return `HETATM${String(start + i).padStart(5)} ${nm.padEnd(4)} ${resn.padStart(3)} ${chain}${String(resi).padStart(4)}    ${a.x.toFixed(3).padStart(8)}${a.y.toFixed(3).padStart(8)}${a.z.toFixed(3).padStart(8)}  1.00  0.00          ${a.elem.toUpperCase().padStart(2)}`;
  }).join("\n") + "\n";
}

// ---- bond estimation from 3D coordinates -------------------------------------------------
export function connectivity(atoms) {
  const bonds = [];
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    const d = dist(atoms[i], atoms[j]);
    if (d > 0.4 && d < rad(atoms[i].elem) + rad(atoms[j].elem) + 0.4) bonds.push([i, j, 1]);
  }
  return bonds;
}
function rings(n, adj) {
  const found = new Map();
  const dfs = (start, cur, path) => {
    if (path.length > 6) return;
    for (const nx of adj[cur]) {
      if (nx === start && path.length >= 5) { const k = [...path].sort((a, b) => a - b).join(","); if (!found.has(k)) found.set(k, [...path]); }
      else if (nx > start && !path.includes(nx)) dfs(start, nx, [...path, nx]);
    }
  };
  for (let s = 0; s < n; s++) dfs(s, s, [s]);
  return [...found.values()];
}
export function estimateOrders(atoms, bonds) {
  const n = atoms.length, adj = Array.from({ length: n }, () => []);
  bonds.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  const ord = new Map(bonds.map(([a, b]) => [`${Math.min(a, b)}-${Math.max(a, b)}`, 1]));
  const key = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  const dbl = new Array(n).fill(false);
  const setD = (a, b) => { ord.set(key(a, b), 2); dbl[a] = dbl[b] = true; };
  atoms.forEach((a, i) => { if (a.elem === "O" && adj[i].length === 1 && ["C", "S", "P"].includes(atoms[adj[i][0]].elem)) setD(i, adj[i][0]); });
  for (const r of rings(n, adj).filter((r) => r.length === 6)) {
    if (!r.every((i) => ["C", "N"].includes(atoms[i].elem) && adj[i].length <= 3)) continue;
    // planarity
    const c = r.reduce((s, i) => [s[0] + atoms[i].x / 6, s[1] + atoms[i].y / 6, s[2] + atoms[i].z / 6], [0, 0, 0]);
    const v1 = [atoms[r[1]].x - atoms[r[0]].x, atoms[r[1]].y - atoms[r[0]].y, atoms[r[1]].z - atoms[r[0]].z];
    const v2 = [atoms[r[2]].x - atoms[r[1]].x, atoms[r[2]].y - atoms[r[1]].y, atoms[r[2]].z - atoms[r[1]].z];
    const nrm = [v1[1] * v2[2] - v1[2] * v2[1], v1[2] * v2[0] - v1[0] * v2[2], v1[0] * v2[1] - v1[1] * v2[0]];
    const nl = Math.hypot(...nrm) || 1;
    if (!r.every((i) => Math.abs(((atoms[i].x - c[0]) * nrm[0] + (atoms[i].y - c[1]) * nrm[1] + (atoms[i].z - c[2]) * nrm[2]) / nl) < 0.15)) continue;
    // order ring atoms around the cycle
    const cyc = [r[0]]; while (cyc.length < 6) { const nx = adj[cyc[cyc.length - 1]].find((x) => r.includes(x) && !cyc.includes(x)); if (nx === undefined) break; cyc.push(nx); }
    if (cyc.length < 6) continue;
    for (const off of [0, 1]) {
      const pairs = [0, 2, 4].map((k) => [cyc[(k + off) % 6], cyc[(k + off + 1) % 6]]);
      if (pairs.every(([a, b]) => !dbl[a] && !dbl[b])) { pairs.forEach(([a, b]) => setD(a, b)); break; }
    }
  }
  return bonds.map(([a, b]) => [a, b, ord.get(key(a, b))]);
}

// ---- 2D depiction --------------------------------------------------------------------
function molblockOf(atoms, bonds) {
  const f = (v) => v.toFixed(4).padStart(10);
  let s = `\n  gen\n\n${String(atoms.length).padStart(3)}${String(bonds.length).padStart(3)}  0  0  0  0  0  0  0  0999 V2000\n`;
  atoms.forEach((a) => { s += `${f(a.x)}${f(a.y)}${f(a.z)} ${cap(a.elem).padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0\n`; });
  bonds.forEach(([a, b, o]) => { s += `${String(a + 1).padStart(3)}${String(b + 1).padStart(3)}${String(o).padStart(3)}  0\n`; });
  return s + "M  END\n";
}
function readMolblock(mb) {
  const L = mb.split("\n"); const na = parseInt(L[3].slice(0, 3)), nb = parseInt(L[3].slice(3, 6));
  const atoms = [], bonds = [];
  for (let i = 0; i < na; i++) { const s = L[4 + i]; atoms.push({ x: +s.slice(0, 10), y: +s.slice(10, 20), elem: cap(s.slice(31, 34).trim()) }); }
  for (let i = 0; i < nb; i++) { const s = L[4 + na + i]; bonds.push([parseInt(s.slice(0, 3)) - 1, parseInt(s.slice(3, 6)) - 1, parseInt(s.slice(6, 9))]); }
  return { atoms, bonds };
}
function adjOf(n, bonds) { const a = Array.from({ length: n }, () => []); bonds.forEach(([x, y]) => { a[x].push(y); a[y].push(x); }); return a; }

// graph isomorphism (element + connectivity), tiny backtracking search
function isoMap(ea, ba, eb, bb) {
  if (ea.length !== eb.length) return null;
  const A = adjOf(ea.length, ba), B = adjOf(eb.length, bb);
  const order = []; const seen = new Set();
  for (let s = 0; s < ea.length; s++) if (!seen.has(s)) { const q = [s]; seen.add(s); while (q.length) { const u = q.shift(); order.push(u); A[u].forEach((v) => { if (!seen.has(v)) { seen.add(v); q.push(v); } }); } }
  const map = new Array(ea.length).fill(-1), used = new Array(eb.length).fill(false);
  let steps = 0;
  const rec = (k) => {
    if (k === order.length) return true;
    if (++steps > 300000) return false;
    const u = order[k];
    for (let v = 0; v < eb.length; v++) {
      if (used[v] || ea[u] !== eb[v] || A[u].length !== B[v].length) continue;
      if (!A[u].every((w) => map[w] === -1 || B[v].includes(map[w]))) continue;
      map[u] = v; used[v] = true;
      if (rec(k + 1)) return true;
      map[u] = -1; used[v] = false;
    }
    return false;
  };
  return rec(0) ? map : null;
}

export async function ligand2D(lig, info, smiles) {
  const rd = await getRDKit();
  const atoms = lig.atoms.map((a) => ({ x: a.x, y: a.y, z: a.z, elem: cap(a.elem) }));
  const els = atoms.map((a) => a.elem);
  let mode = "estimated", note = "Bond orders are estimated from the 3D coordinates.";
  let bonds = info?.bondsKnown && info.atoms.length === atoms.length ? info.bonds : null;
  if (bonds) { mode = "file"; note = "Bond orders are taken from the uploaded ligand file."; }
  const g3 = connectivity(atoms);

  if (!bonds && smiles) {
    const m = rd.get_mol(smiles);
    if (m && m.is_valid()) {
      m.set_new_coords();
      const mb = readMolblock(m.get_molblock()); m.delete();
      const map = isoMap(els, g3, mb.atoms.map((a) => a.elem), mb.bonds);
      if (map) {
        const pos = atoms.map((_, i) => [mb.atoms[map[i]].x, mb.atoms[map[i]].y]);
        const inv = new Map(map.map((v, i) => [v, i]));
        const bd = mb.bonds.map(([a, b, o]) => [inv.get(a), inv.get(b), o]);
        return { pos, bonds: bd, mode: "smiles", note: "Structure drawn from the SMILES; atoms matched to the 3D ligand by connectivity." };
      }
      note = "The SMILES did not match the 3D ligand atom for atom, so bond orders are estimated.";
    } else note = "The SMILES could not be read, so bond orders are estimated.";
  }
  if (!bonds) bonds = estimateOrders(atoms, g3);
  const m = rd.get_mol(molblockOf(atoms, bonds), JSON.stringify({ sanitize: false, removeHs: false }));
  if (!m) throw new Error("RDKit could not read the ligand.");
  m.set_new_coords();
  const mb = readMolblock(m.get_molblock()); m.delete();
  return { pos: mb.atoms.map((a) => [a.x, a.y]), bonds: mb.bonds, mode, note };
}
