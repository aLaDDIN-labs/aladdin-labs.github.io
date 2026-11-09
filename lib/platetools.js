// Plate planner: dilution series, buffer recipes and BLI plate layouts.
export const CU = [["M", 1], ["mM", 1e-3], ["µM", 1e-6], ["nM", 1e-9], ["pM", 1e-12]];
export const toM = (v, u) => v * (CU.find((x) => x[0] === u)?.[1] ?? 1);
export const sig = (v, n = 4) => (!Number.isFinite(v) ? "–" : v === 0 ? "0" : String(parseFloat(Number(v).toPrecision(n))));
export const fVol = (ul) => (!Number.isFinite(ul) ? "–" : ul >= 1000 ? `${sig(ul / 1000)} mL` : `${sig(ul)} µL`);
export const bestConc = (m) => { // molar -> "12.5 µM"
  for (const [u, f] of CU) { const v = m / f; if (v >= 0.9995 && v < 1000) return `${sig(v)} ${u}`; }
  return `${sig(m / 1e-12)} pM`;
};
export const letters = "ABCDEFGH";
export const toCSV = (rows) => rows.map((r) => r.map((v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n") + "\n";

// ---- dilution series ---------------------------------------------------------------------
// p: stock, stockU, top, topU, factor, points, blank, dmso (final %), method ('buffer' | 'dmso'),
//    vUse: array (µL needed at each point), vBlank, vInt (µL of intermediate to make, 0 = auto)
export function dilutionPlan(p) {
  const N = Math.round(p.points), f = +p.factor, d = +p.dmso;
  const Cs = toM(+p.stock, p.stockU), Ct = toM(+p.top, p.topU);
  if (!(Cs > 0 && Ct > 0)) return { error: "Enter the stock and top concentrations." };
  if (!(f > 1)) return { error: "The dilution factor must be greater than 1." };
  if (!(N >= 1 && N <= 24)) return { error: "Use 1 to 24 points." };
  if (!(d >= 0 && d <= 100)) return { error: "DMSO must be between 0 and 100 %." };
  const aq = d === 0; // water-soluble compound: no DMSO matching
  const D = aq ? 1 : 100 / d, Ci = Ct * D;
  if (Ci > Cs * 1.000001) return { error: `The stock is too dilute. The top point needs ${bestConc(Ci)} in the stock (${aq ? "" : sig(D) + "× of the top concentration"}).` };
  const vUse = Array.from({ length: N }, (_, k) => +(p.vUse?.[k] ?? p.vUse) || 0);
  const vBlank = p.blank ? +p.vBlank || 0 : 0;
  const method = aq ? "buffer" : p.method;
  const unitConc = (k) => ({ v: +p.top / Math.pow(f, k), u: p.topU });
  const conc = (k) => { const c = unitConc(k); return `${sig(c.v)} ${c.u}`; };
  const warns = []; const chk = (v, what) => { if (v > 0 && v < 2) warns.push(`${what}: ${fVol(v)} is below 2 µL. Increase the volume or add an intermediate step.`); };
  const sections = []; const tot = { stock: 0, dmso: 0, buf0: 0, bufD: 0 };
  const label = aq ? "assay buffer" : `assay buffer (${sig(d)}% DMSO)`;

  if (method === "buffer") {
    const V = Array(N); for (let k = N - 1; k >= 0; k--) V[k] = vUse[k] + (k < N - 1 ? V[k + 1] / f : 0);
    const rows = [];
    if (!aq) {
      const viNeed = V[0] / D;
      let vi = +p.vInt > 0 ? +p.vInt : Math.ceil(Math.max(viNeed * 1.1, (5 * Cs) / Ci) / 10) * 10;
      if (vi < viNeed) warns.push(`The intermediate (${fVol(vi)}) is smaller than the ${fVol(viNeed)} needed for point 1.`);
      const sv = (vi * Ci) / Cs, dv = vi - sv; chk(sv, "Stock for the intermediate");
      sections.push({ title: `Step 1 · ${sig(D)}× intermediate in DMSO`, rows: [{ id: "Intermediate", conc: bestConc(Ci), how: sv >= vi * 0.9999 ? `Stock ${fVol(vi)}` : `Stock ${fVol(sv)} + DMSO ${fVol(dv)}`, vol: vi }] });
      tot.stock += sv; tot.dmso += dv;
      const b0 = V[0] - V[0] / D; tot.buf0 += b0; chk(V[0] / D, "Intermediate for point 1");
      rows.push({ id: "Point 1", conc: conc(0), how: `Intermediate ${fVol(V[0] / D)} + assay buffer without DMSO ${fVol(b0)}`, vol: V[0] });
    } else {
      const sv = (V[0] * Ct) / Cs, bv = V[0] - sv; chk(sv, "Stock for point 1"); tot.stock += sv; tot.bufD += bv;
      rows.push({ id: "Point 1", conc: conc(0), how: `Stock ${fVol(sv)} + ${label} ${fVol(bv)}`, vol: V[0] });
    }
    for (let k = 1; k < N; k++) { const t = V[k] / f, b = V[k] - t; chk(t, `Transfer to point ${k + 1}`); tot.bufD += b; rows.push({ id: `Point ${k + 1}`, conc: conc(k), how: `Point ${k} ${fVol(t)} + ${label} ${fVol(b)}`, vol: V[k] }); }
    if (p.blank) { tot.bufD += vBlank; rows.push({ id: "Blank", conc: `0 ${p.topU}`, how: `${label[0].toUpperCase() + label.slice(1)} ${fVol(vBlank)}`, vol: vBlank }); }
    sections.push({ title: aq ? "Dilution series" : `Step 2 · Dilution series in buffer with ${sig(d)}% DMSO`, rows });
  } else {
    const U = Array(N); for (let k = N - 1; k >= 0; k--) U[k] = vUse[k] / D + (k < N - 1 ? U[k + 1] / f : 0);
    const mn = Math.min((U[0] * Ci) / Cs, ...U.slice(1).map((u) => u / f));
    if (mn < 5) { const sc = 5 / mn; for (let k = 0; k < N; k++) U[k] *= sc; warns.push(`The DMSO series was scaled ×${sig(sc, 3)} so that no pipetting step is below 5 µL. The extra is left over.`); }
    const r1 = [];
    const sv = (U[0] * Ci) / Cs, dv0 = U[0] - sv; chk(sv, "Stock for DMSO point 1"); tot.stock += sv; tot.dmso += dv0;
    r1.push({ id: "DMSO point 1", conc: bestConc(Ci), how: sv >= U[0] * 0.9999 ? `Stock ${fVol(U[0])}` : `Stock ${fVol(sv)} + DMSO ${fVol(dv0)}`, vol: U[0] });
    for (let k = 1; k < N; k++) { const t = U[k] / f, b = U[k] - t; chk(t, `Transfer to DMSO point ${k + 1}`); tot.dmso += b; r1.push({ id: `DMSO point ${k + 1}`, conc: bestConc(Ci / Math.pow(f, k)), how: `DMSO point ${k} ${fVol(t)} + DMSO ${fVol(b)}`, vol: U[k] }); }
    sections.push({ title: `Step 1 · Series in 100% DMSO (${sig(D)}× the final concentration)`, rows: r1 });
    const r2 = [];
    for (let k = 0; k < N; k++) { const s = vUse[k] / D, b = vUse[k] - s; chk(s, `DMSO spike for point ${k + 1}`); tot.buf0 += b; r2.push({ id: `Point ${k + 1}`, conc: conc(k), how: `DMSO point ${k + 1} ${fVol(s)} + assay buffer without DMSO ${fVol(b)}`, vol: vUse[k] }); }
    if (p.blank) { const s = vBlank / D, b = vBlank - s; tot.dmso += s; tot.buf0 += b; r2.push({ id: "Blank", conc: `0 ${p.topU}`, how: `DMSO ${fVol(s)} + assay buffer without DMSO ${fVol(b)}`, vol: vBlank }); }
    sections.push({ title: `Step 2 · Spike into buffer (final ${sig(d)}% DMSO)`, rows: r2 });
  }
  return { sections, warns, tot, aq, method, label };
}

// ---- buffer recipes ------------------------------------------------------------------------
export function bufferRow(vFinal, comps, vals) {
  const parts = comps.map((c) => { const f = parseFloat(vals?.[c.id]); const s = parseFloat(c.stock); return Number.isFinite(f) && f > 0 && s > 0 ? (vFinal * f) / s : 0; });
  const used = parts.reduce((a, b) => a + b, 0);
  return { parts, water: vFinal - used };
}

// ---- BLI plate --------------------------------------------------------------------------
export function platePlan(c) {
  if (c.kin === "single") return singlePlan(c);
  const N = Math.round(c.points), f = +c.factor, warnings = [];
  const refRow = 7, blankRow = N;
  if (N + (c.blank ? 1 : 0) + (c.useRef ? 1 : 0) > 8) warnings.push(`${N} points + blank + reference need more than 8 rows. Reduce the number of points or split into two plates.`);
  const dm = +c.dmso, bufName = dm > 0 ? `Buffer ${sig(dm)}% DMSO` : "Buffer";
  const steps = c.steps.map((s, i) => ({ ...s, col: (c.startCol - 1) + i }));
  if (steps.length && steps[steps.length - 1].col > 11) warnings.push(`The steps need ${steps.length} columns starting at column ${c.startCol}. A 96-well plate has 12.`);
  const wells = [];
  const an = (id) => c.analytes.find((a) => a.id === id);
  steps.forEach((s, si) => {
    if (s.col > 11) return;
    const a = s.t === "assoc" ? an(s.a) : null;
    for (let r = 0; r < 8; r++) {
      let w = null; const base = { well: letters[r] + (s.col + 1), row: r, col: s.col, step: si, t: s.t };
      if (s.t === "baseline" || s.t === "dissoc") { if (r <= N - 1 + (c.blank ? 1 : 0) || (c.useRef && r === refRow)) w = { ...base, text: s.t === "baseline" ? "Buffer" : "Buffer", sub: dm > 0 ? `${sig(dm)}% DMSO` : "", full: bufName, kind: "buf" }; }
      else if (s.t === "loading") {
        if (r < N + (c.blank ? 1 : 0)) w = { ...base, text: c.ligand.name || "Ligand", sub: `${sig(c.ligand.load)} ${c.ligand.loadU}`, full: `${c.ligand.name} ${sig(c.ligand.load)} ${c.ligand.loadU}`, kind: "load" };
        else if (c.useRef && r === refRow) w = { ...base, text: c.refName || "Reference", sub: "", full: `Reference loading: ${c.refName}`, kind: "ref" };
      } else if (s.t === "assoc" && a) {
        if (r < N) { const v = +a.top / Math.pow(f, r); w = { ...base, text: sig(v, 4), sub: a.topU, full: `${a.name} ${sig(v)} ${a.topU}`, kind: "assoc", rank: N > 1 ? r / (N - 1) : 0, conc: v, cu: a.topU, an: a.name }; }
        else if (c.blank && r === blankRow) w = { ...base, text: "Blank", sub: bufName.replace("Buffer ", ""), full: `${a.name} blank (buffer only)`, kind: "blank", conc: 0, cu: a.topU, an: a.name };
        else if (c.useRef && r === refRow) w = { ...base, text: sig(+a.top, 4), sub: `${a.topU} ref`, full: `${a.name} ${sig(+a.top)} ${a.topU} on reference sensor`, kind: "refassoc", conc: +a.top, cu: a.topU, an: a.name };
      } else if (s.t === "regen" || s.t === "custom") {
        if (r < N + (c.blank ? 1 : 0) || (c.useRef && r === refRow)) w = { ...base, text: s.label || (s.t === "regen" ? "Regeneration" : "Solution"), sub: "", full: s.label || s.t, kind: s.t };
      }
      if (w) { w.vol = +c.wellVol; wells.push(w); }
    }
  });
  // solutions to prepare
  const sols = [], plans = {};
  const ex = +c.extra || 0, V = +c.wellVol;
  const colsOf = (t) => steps.filter((s) => s.t === t && s.col <= 11);
  const bufWells = wells.filter((w) => w.kind === "buf"), bufCols = new Set(bufWells.map((w) => w.col)).size;
  let bufTotal = bufWells.length * V + bufCols * ex;
  let buf0 = 0;
  const loadW = wells.filter((w) => w.kind === "load");
  if (loadW.length) {
    const vt = loadW.length * V + colsOf("loading").length * ex, L = c.ligand;
    const sv = +L.stock > 0 ? (vt * +L.load) / +L.stock : NaN;
    sols.push({ name: `${L.name || "Ligand"} loading solution (${sig(L.load)} ${L.loadU})`, vol: vt, how: Number.isFinite(sv) ? (sv > vt ? "The stock is too dilute for this loading concentration." : `Ligand stock ${fVol(sv)} + ${dm > 0 ? `buffer with ${sig(dm)}% DMSO` : "buffer"} ${fVol(vt - sv)}`) : "Enter the ligand stock concentration." });
  }
  const refW = wells.filter((w) => w.kind === "ref");
  if (refW.length) sols.push({ name: `${c.refName || "Reference"} loading solution`, vol: refW.length * V + ex, how: "Prepare at the same concentration as the ligand." });
  c.analytes.forEach((a) => {
    const aw = wells.filter((w) => w.an === a.name && (w.kind === "assoc" || w.kind === "blank" || w.kind === "refassoc"));
    if (!aw.length) return;
    const vUse = Array.from({ length: N }, (_, k) => V + ex + (k === 0 && c.useRef ? V : 0));
    const pl = dilutionPlan({ stock: a.stock, stockU: a.stockU, top: a.top, topU: a.topU, factor: f, points: N, blank: c.blank, dmso: dm, method: c.method, vUse, vBlank: V + ex, vInt: 0 });
    plans[a.id] = pl;
    if (!pl.error) { bufTotal += pl.tot.bufD; buf0 += pl.tot.buf0; }
  });
  const regW = wells.filter((w) => w.kind === "regen" || w.kind === "custom");
  steps.filter((s) => s.t === "regen" || s.t === "custom").forEach((s) => { const n = wells.filter((w) => w.step === steps.indexOf(s)).length; if (n) sols.push({ name: s.label || (s.t === "regen" ? "Regeneration solution" : "Solution"), vol: n * V + ex, how: "Prepare as specified." }); });
  sols.unshift({ name: bufName, vol: bufTotal, how: `${bufWells.length} wells × ${V} µL plus ${ex} µL extra per column${Object.keys(plans).length ? " plus the volume used for dilutions" : ""}` });
  if (buf0 > 0) sols.splice(1, 0, { name: "Buffer without DMSO", vol: buf0, how: "Used for the first point (intermediate spike)." });
  return { wells, steps, sols, plans, warnings, nRows: N + (c.blank ? 1 : 0) + (c.useRef ? 1 : 0), bufName };
}

// ---- BLI plate, single-cycle kinetics: one sensor (row) per compound, rising concentrations in one run ----
export function singlePlan(c) {
  const N = Math.max(1, Math.round(c.points)), f = +c.factor, V = +c.wellVol, ex = +c.extra || 0, warnings = [];
  const dm = +c.dmso, bufName = dm > 0 ? `Buffer ${sig(dm)}% DMSO` : "Buffer";
  const cmps = c.analytes, refs = c.refRows || [];
  const rows = [...cmps.map((a) => ({ k: "cmp", a })), ...(c.blank ? [{ k: "blank" }] : []), ...refs.map((r) => ({ k: "ref", a: cmps.find((x) => x.id === r.a) || null }))];
  if (rows.length > 8) warnings.push(`${rows.length} sensors are needed (${cmps.length} compounds${c.blank ? ", 1 blank" : ""}${refs.length ? `, ${refs.length} reference` : ""}), but a plate has 8 rows. Remove some or split into two plates.`);
  const seq = [{ t: "baseline" }, { t: "loading" }, { t: "baseline" }, ...Array.from({ length: N }, (_, j) => ({ t: "assoc", j, hd: `Assoc. ${j + 1}` })), { t: "dissoc" }];
  const steps = seq.map((s, i) => ({ ...s, col: (c.startCol - 1) + i }));
  if (steps[steps.length - 1].col > 11) warnings.push(`The run needs ${steps.length} columns starting at column ${c.startCol}. A 96-well plate has 12. Reduce the points.`);
  const wells = [];
  steps.forEach((st, si) => {
    if (st.col > 11) return;
    rows.slice(0, 8).forEach((row, r) => {
      const base = { well: letters[r] + (st.col + 1), row: r, col: st.col, step: si, t: st.t }; let w = null;
      if (st.t === "baseline" || st.t === "dissoc") w = { ...base, text: "Buffer", sub: dm > 0 ? `${sig(dm)}% DMSO` : "", full: bufName, kind: "buf" };
      else if (st.t === "loading") {
        if (row.k === "ref") w = { ...base, text: c.refName || "No protein", sub: "", full: c.refName ? `Reference sensor, loaded with ${c.refName}` : "Reference sensor, no protein loaded", kind: "ref" };
        else w = { ...base, text: c.ligand.name || "Ligand", sub: `${sig(c.ligand.load)} ${c.ligand.loadU}`, full: `${c.ligand.name} ${sig(c.ligand.load)} ${c.ligand.loadU}`, kind: "load" };
      } else if (st.t === "assoc") {
        const a = row.a;
        if (row.k === "blank") w = { ...base, text: "Blank", sub: bufName.replace("Buffer ", ""), full: "Blank sensor with ligand, buffer only", kind: "blank" };
        else if (!a) w = { ...base, text: "Blank", sub: "no protein", full: "Reference sensor, buffer only", kind: "blank" };
        else { const v = +a.top / Math.pow(f, N - 1 - st.j); w = { ...base, text: sig(v, 4), sub: a.topU + (row.k === "ref" ? " ref" : ""), full: `${a.name} ${sig(v)} ${a.topU}${row.k === "ref" ? " on reference sensor" : ""}`, kind: row.k === "ref" ? "refassoc" : "assoc", rank: N > 1 ? st.j / (N - 1) : 0, conc: v, cu: a.topU, an: a.name }; }
      }
      if (w) { w.vol = V; wells.push(w); }
    });
  });
  const sols = [], plans = {};
  const bufWells = wells.filter((w) => w.kind === "buf" || w.kind === "blank");
  let bufTotal = bufWells.length * V + new Set(bufWells.map((w) => w.col)).size * ex, buf0 = 0;
  const loadW = wells.filter((w) => w.kind === "load");
  if (loadW.length) {
    const L = c.ligand, vt = loadW.length * V + ex, sv = +L.stock > 0 ? (vt * +L.load) / +L.stock : NaN;
    sols.push({ name: `${L.name || "Ligand"} loading solution (${sig(L.load)} ${L.loadU})`, vol: vt, how: Number.isFinite(sv) ? (sv > vt ? "The stock is too dilute for this loading concentration." : `Ligand stock ${fVol(sv)} + ${dm > 0 ? `buffer with ${sig(dm)}% DMSO` : "buffer"} ${fVol(vt - sv)}`) : "Enter the ligand stock concentration." });
  }
  const refW = wells.filter((w) => w.kind === "ref");
  if (refW.length) sols.push({ name: `${c.refName || "Reference (no protein)"} loading solution`, vol: refW.length * V + ex, how: c.refName ? "Prepare at the same concentration as the ligand." : "Assay buffer only, no protein." });
  cmps.forEach((a) => {
    const nRef = refs.filter((r) => r.a === a.id).length;
    if (!rows.some((r) => r.a && r.a.id === a.id)) return;
    const vUse = Array.from({ length: N }, () => V + ex + V * nRef);
    const pl = dilutionPlan({ stock: a.stock, stockU: a.stockU, top: a.top, topU: a.topU, factor: f, points: N, blank: false, dmso: dm, method: c.method, vUse, vBlank: 0, vInt: 0 });
    plans[a.id] = pl;
    if (!pl.error) { bufTotal += pl.tot.bufD; buf0 += pl.tot.buf0; }
  });
  sols.unshift({ name: bufName, vol: bufTotal, how: `${bufWells.length} wells × ${V} µL plus ${ex} µL extra per column${Object.keys(plans).length ? " plus the volume used for dilutions" : ""}` });
  if (buf0 > 0) sols.splice(1, 0, { name: "Buffer without DMSO", vol: buf0, how: "Used for the first point (intermediate spike)." });
  return { wells, steps, sols, plans, warnings, nRows: rows.length, bufName, single: true };
}

// ---- layout designer (dose-response style plates) --------------------------------------------
export const PAL = ["#F39800", "#6F6BD8", "#2E9E72", "#D9534F", "#3B8EDB", "#B07AC6", "#8A6D3B", "#E0709B", "#2AA3A3", "#9AA03A"];
export const rowLetters = "ABCDEFGHIJKLMNOP";
const mixHex = (hex, t) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t)); return `rgb(${c})`; };
export const SNAPS = [["exact", "Exact (from max and min)"], ["2", "2-fold"], ["3", "3-fold"], ["3.1623", "half-log (√10)"], ["4", "4-fold"], ["5", "5-fold"], ["10", "10-fold"]];

// series from max, min, points; snap = "exact" or a factor (min is then recalculated)
export function seriesFor(max, min, points, snap) {
  const p = Math.round(points);
  if (!(max > 0 && min > 0 && p >= 2)) return { error: "Enter a maximum and minimum concentration greater than 0 and at least 2 points." };
  if (!(max > min)) return { error: "The maximum must be larger than the minimum." };
  let f = Math.pow(max / min, 1 / (p - 1)), note = "";
  if (snap && snap !== "exact") { f = +snap; const nm = max / Math.pow(f, p - 1); note = `With a ${sig(f, 3)}-fold series the lowest concentration becomes ${sig(nm, 3)} instead of ${sig(min, 3)}.`; min = nm; }
  return { f, min, p, note, conc: Array.from({ length: p }, (_, k) => max / Math.pow(f, k)) };
}

export function doseLayout(o) {
  const R = o.plate === 384 ? 16 : 8, C = o.plate === 384 ? 24 : 12;
  const e = o.edge ? 1 : 0, r0 = e, r1 = R - 1 - e, c0 = e, c1 = C - 1 - e;
  const horizontal = o.orient === "row";
  const lineLen = horizontal ? c1 - c0 + 1 : r1 - r0 + 1;
  const nLines = horizontal ? r1 - r0 + 1 : c1 - c0 + 1;
  const s = seriesFor(+o.max, +o.min, o.points, o.snap);
  if (s.error) return { error: s.error };
  const veh = Math.max(0, Math.round(+o.veh || 0)), pos = Math.max(0, Math.round(+o.pos || 0));
  const need = veh + s.p + pos;
  if (need > lineLen) return { error: `One series needs ${need} wells (${veh} vehicle + ${s.p} points + ${pos} positive), but a ${horizontal ? "row" : "column"} has only ${lineLen} usable wells. Reduce the points, use a 384-well plate, or include the edge wells.` };
  const n = Math.round(o.nComp), reps = Math.round(o.reps);
  if (!(n >= 1 && reps >= 1)) return { error: "Enter at least 1 compound and 1 replicate." };
  const names = Array.from({ length: n }, (_, i) => (o.names?.[i] || `Cpd${i + 1}`).trim() || `Cpd${i + 1}`);
  const items = [];
  if (o.repMode === "blocks") { for (let r = 0; r < reps; r++) for (let i = 0; i < n; i++) items.push({ i, r }); }
  else { for (let i = 0; i < n; i++) for (let r = 0; r < reps; r++) items.push({ i, r }); }
  const nPlates = Math.ceil(items.length / nLines);
  const plates = [];
  for (let pi = 0; pi < nPlates; pi++) {
    const cells = new Map(); const put = (r, c, w) => cells.set(r + "-" + c, { row: r, col: c, well: rowLetters[r] + (c + 1), ...w });
    if (e && o.fillEdge) for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (r < r0 || r > r1 || c < c0 || c > c1) put(r, c, { kind: "edge", fill: "#EDEAE0", text: "", sub: "", full: "Edge well filled with PBS or medium (not used for samples)" });
    items.slice(pi * nLines, (pi + 1) * nLines).forEach((it, li) => {
      const at = (pj) => (horizontal ? [r0 + li, c0 + pj] : [r0 + pj, c0 + li]);
      for (let j = 0; j < veh; j++) { const [r, c] = at(j); put(r, c, { kind: "veh", fill: "#DADADA", text: "Veh", sub: "", full: `Vehicle control (line ${li + 1})` }); }
      s.conc.forEach((cv, k) => { const [r, c] = at(veh + k); put(r, c, { kind: "dose", comp: it.i, fill: mixHex(PAL[it.i % PAL.length], 0.8 * (k / (s.p - 1))), text: sig(cv, 3), sub: names[it.i].slice(0, 6), full: `${names[it.i]} · replicate ${it.r + 1} · ${sig(cv, 4)} ${o.unit}`, conc: cv, rep: it.r + 1 }); });
      for (let j = 0; j < pos; j++) { const [r, c] = at(veh + s.p + j); put(r, c, { kind: "pos", fill: "#F4B6B6", text: "Pos", sub: "", full: `Positive control (line ${li + 1})` }); }
    });
    plates.push([...cells.values()]);
  }
  const usable = nLines * lineLen;
  return { R, C, plates, series: s, names, nPlates, linesNeeded: items.length, nLines, lineLen, wellsPerPlate: plates.map((p) => p.filter((x) => x.kind !== "edge").length), usable, warnings: [] };
}
