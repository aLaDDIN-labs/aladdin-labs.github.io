// BLI kinetics (Octet .frd) for the BLI fit tool. Everything runs in the browser; files are never uploaded.
//   single : single-cycle kinetics, one sensor sees an ascending concentration series (one compound per sensor)
//   multi  : one concentration per sensor, same compound (sensors with the same compound ID are fitted together)
// Model: 1:1 Langmuir, global kon / koff / Rmax per compound, optional concentration-independent bulk offset.

const TAIL_S = 5; // seconds averaged at the end of a step
const UNIT_UM = { pM: 1e-6, nM: 1e-3, "µM": 1, "µM": 1, uM: 1, mM: 1e3, M: 1e6 };
const MAX_BYTES = 60e6;

// ------------------------------------------------------------------ parsing
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const tag = (s, n) => { const m = s.match(new RegExp("<" + n + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + n + ">")); return m ? unesc(m[1].trim()) : ""; };
const num = (t, d = NaN) => { const v = parseFloat(t); return Number.isFinite(v) ? v : d; };

function decodeF32(b64) {
  const bin = atob(b64.replace(/\s+/g, ""));
  const dv = new DataView(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) dv.setUint8(i, bin.charCodeAt(i));
  const out = new Float64Array(bin.length >> 2);
  for (let i = 0; i < out.length; i++) out[i] = dv.getFloat32(i * 4, true);
  return out;
}

function molarUM(c) {
  const molar = num(tag(c, "MolarConcentration"), -1);
  const unit = tag(c, "MolarConcUnits") || "µM";
  if (molar > 0 && UNIT_UM[unit] !== undefined) return molar * UNIT_UM[unit];
  const conc = num(tag(c, "Concentration"), -1), mw = num(tag(c, "MolecularWeight"), -1);
  const cu = tag(c, "ConcentrationUnits").toLowerCase().replace(/[µµ]/g, "u");
  if (conc > 0 && mw > 0 && cu.startsWith("ug/ml")) return conc / mw; // ug/ml per kDa = uM
  return NaN;
}

export function parseFrd(text, fname) {
  if (text.length > MAX_BYTES) throw new Error(`${fname}: file too large`);
  if (text.includes("<!ENTITY")) throw new Error(`${fname}: unsupported XML content`);
  if (!text.includes("<ExperimentResults") || !text.includes("<KineticsData")) throw new Error(`${fname}: not an Octet kinetics .frd file`);
  const info = (text.match(/<ExperimentInfo[\s\S]*?<\/ExperimentInfo>/) || [""])[0];
  const expName = ((info.match(/<ExperimentInfo[^>]*\sName="([^"]*)"/) || [])[1]) || "";
  const steps = [];
  const re = /<Step>([\s\S]*?)<\/Step>/g;
  let m;
  while ((m = re.exec(text))) {
    const s = m[1], c = tag(s, "CommonData");
    const x = decodeF32(tag(s, "AssayXData")), y = decodeF32(tag(s, "AssayYData"));
    const n = Math.min(x.length, y.length);
    steps.push({
      name: tag(s, "StepName"), stype: tag(s, "StepType").toUpperCase(), sid: tag(c, "SampleID"), wtype: tag(c, "WellType").toUpperCase(),
      molarUM: molarUM(c), temp: num(tag(c, "Temperature")), x: x.subarray(0, n), y: y.subarray(0, n),
    });
  }
  if (!steps.length) throw new Error(`${fname}: no steps found`);
  return {
    file: fname, sensor: tag(info, "SensorName") || fname, expName, runId: tag(info, "RunID"), start: tag(info, "StartDateTime"),
    instrument: `${tag(info, "InstrumentType")} ${tag(info, "InstrumentSerial")}`.trim(), sensorType: tag(info, "SensorType"),
    user: tag(info, "UserName"), plate: tag(info, "PlateName"), steps,
  };
}

const tailMean = (st) => { const { x, y } = st; const lim = x[x.length - 1] - TAIL_S; let s = 0, n = 0; for (let i = 0; i < x.length; i++) if (x[i] >= lim) { s += y[i]; n++; } return s / n; };
const nat = (name) => { const m = /^([A-Za-z]+)(\d+)/.exec(name); return m ? [+m[2], m[1]] : [0, name]; };
const median = (a) => { const b = [...a].sort((p, q) => p - q); const k = b.length >> 1; return b.length ? (b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2) : 0; };

/** files: [{name, text}] -> { info, raw } */
export function loadExperiment(files) {
  const raw = {};
  let meta = null;
  for (const f of files) {
    if (!/\.frd$/i.test(f.name)) continue;
    const p = parseFrd(f.text, f.name);
    let key = p.sensor;
    if (raw[key]) key = `${key} [${f.name}]`;
    p.exp = p.runId || p.start || p.expName || p.file;
    raw[key] = p;
    meta = meta || { expName: p.expName, runId: p.runId, start: p.start, instrument: p.instrument, sensorType: p.sensorType, user: p.user, plate: p.plate };
  }
  if (!meta) throw new Error("No .frd files found");
  const sensors = Object.keys(raw).sort((a, b) => { const A = nat(a), B = nat(b); return A[0] - B[0] || (A[1] < B[1] ? -1 : A[1] > B[1] ? 1 : 0); }).map((name) => {
    const st = raw[name].steps;
    const ld = st.filter((s) => s.stype === "LOADING");
    const load = ld.length ? tailMean(ld[ld.length - 1]) - (ld[ld.length - 1].y[0] + ld[ld.length - 1].y[1] + ld[ld.length - 1].y[2]) / 3 : null;
    const assoc = st.filter((s) => s.stype === "ASSOC");
    return {
      name, file: raw[name].file, exp: raw[name].exp, load, compound: (assoc.find((s) => s.sid) || {}).sid || "", nAssoc: assoc.length,
      concs: assoc.map((s) => (Number.isNaN(s.molarUM) ? null : s.molarUM)),
      isBuffer: assoc.length > 0 && assoc.every((s) => s.wtype === "BUFFER" || ["buffer", "blank", "ref", "reference", ""].includes(s.sid.toLowerCase()) || (!Number.isNaN(s.molarUM) && s.molarUM <= 0)),
    };
  });
  const med = median(sensors.filter((o) => o.load != null).map((o) => o.load));
  for (const o of sensors) { o.lowLoad = o.load != null && med > 0 && o.load < 0.5 * med; o.include = !o.lowLoad; o.reference = false; }
  const expKeys = [...new Set(sensors.map((o) => o.exp))];
  sensors.forEach((o) => { o.expNo = expKeys.indexOf(o.exp) + 1; });
  for (const k of expKeys) {
    const cands = sensors.filter((o) => o.exp === k && o.isBuffer && !o.lowLoad);
    if (cands.length) cands.reduce((a, b) => (Math.abs((a.load || 0) - med) <= Math.abs((b.load || 0) - med) ? a : b)).reference = true;
  }
  for (const o of sensors) if (o.isBuffer && !o.reference) o.include = false;
  const nas = sensors.filter((o) => o.include && !o.reference).map((o) => o.nAssoc);
  return { info: { meta, nExp: expKeys.length, sensors, medianLoad: med, mode: nas.length && median(nas) >= 2 ? "single" : "multi" }, raw };
}

// ------------------------------------------------------------------ run building
function buildRun(sd, rd, mode, nPoints, concOverride, scale) {
  const st = sd.steps;
  let A = st.map((s, i) => (s.stype === "ASSOC" ? i : -1)).filter((i) => i >= 0);
  if (!A.length) throw new Error(`${sd.sensor}: no association step`);
  A = mode === "multi" ? A.slice(0, 1) : A.slice(0, nPoints);
  const first = A[0];
  if (first === 0) throw new Error(`${sd.sensor}: no baseline step before association`);
  const aligned = (i) => {
    const y = Float64Array.from(st[i].y);
    if (rd) { if (!rd.steps[i]) throw new Error(`${sd.sensor}: the reference sensor has no step ${i + 1}; choose a reference from the same run`); const ry = rd.steps[i].y, n = Math.min(y.length, ry.length); const o = new Float64Array(n); for (let k = 0; k < n; k++) o[k] = y[k] - ry[k]; return [st[i].x.subarray(0, n), o]; }
    return [st[i].x, y];
  };
  const [xb, yb] = aligned(first - 1);
  let zs = 0, zn = 0; for (let k = 0; k < xb.length; k++) if (xb[k] >= xb[xb.length - 1] - TAIL_S) { zs += yb[k]; zn++; }
  const zero = zs / zn;
  const pre = { t: xb, y: Float64Array.from(yb, (v) => (v - zero) * scale) };
  const T = [], Y = [], Cc = [], bounds = [], ends = [];
  let pos = 0;
  for (const a of A) {
    for (const idx of [a, a + 1]) {
      if (idx >= st.length) break;
      const s = st[idx]; let C;
      if (idx === a) {
        C = concOverride != null ? concOverride : s.molarUM;
        if (C == null || Number.isNaN(C) || C <= 0) throw new Error(`${sd.sensor}: concentration of step ${idx} is missing; enter it in the table`);
      } else { if (s.stype !== "DISASSOC") break; C = 0; }
      const [x, y0] = aligned(idx);
      const y = new Float64Array(y0.length); for (let k = 0; k < y.length; k++) y[k] = (y0[k] - zero) * scale;
      const n = x.length;
      T.push(x); Y.push(y); Cc.push(new Float64Array(n).fill(C * 1e-6)); bounds.push([pos, pos + n]);
      if (idx === a) { let es = 0, en = 0; for (let k = 0; k < n; k++) if (x[k] >= x[n - 1] - TAIL_S) { es += y[k]; en++; } ends.push([C, es / en]); }
      pos += n;
    }
  }
  const cat = (arr) => { const o = new Float64Array(pos); let p = 0; for (const a of arr) { o.set(a, p); p += a.length; } return o; };
  return { sensor: sd.sensor, t: cat(T), y: cat(Y), c: cat(Cc), bounds, ends, pre };
}

function sim(kon, koff, rmax, ri, run, out) {
  const { t, c } = run; let R = 0;
  for (const [a, b] of run.bounds) {
    const C = c[a], kobs = kon * C + koff, req = (rmax * kon * C) / kobs, t0 = t[a], off = C > 0 ? ri : 0;
    for (let i = a; i < b; i++) out[i] = req + (R - req) * Math.exp(-kobs * (t[i] - t0)) + off;
    R = req + (R - req) * Math.exp(-kobs * (t[b - 1] - t0));
  }
  return out;
}

function decimate(run, k) {
  const t = [], y = [], c = [], bounds = []; let pos = 0;
  for (const [a, b] of run.bounds) { const s = pos; for (let i = a; i < b; i += k) { t.push(run.t[i]); y.push(run.y[i]); c.push(run.c[i]); pos++; } bounds.push([s, pos]); }
  return { ...run, t: Float64Array.from(t), y: Float64Array.from(y), c: Float64Array.from(c), bounds };
}

// ------------------------------------------------------------------ least squares (Levenberg-Marquardt with box bounds)
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let k = i + 1; k < n; k++) s -= M[i][k] * x[k]; x[i] = s / M[i][i]; }
  return x;
}
function invert(A) {
  const n = A.length, cols = [];
  for (let j = 0; j < n; j++) { const e = Array(n).fill(0); e[j] = 1; const x = solve(A, e); if (!x) return null; cols.push(x); }
  return A.map((_, i) => cols.map((c) => c[i]));
}
const ssq = (r) => { let s = 0; for (let i = 0; i < r.length; i++) s += r[i] * r[i]; return s; };

function jacobian(resid, p, r0, lo, hi) {
  const J = [];
  for (let j = 0; j < p.length; j++) {
    const h = 1e-6 * Math.max(1, Math.abs(p[j])), q = p.slice();
    q[j] = p[j] + h <= hi[j] ? p[j] + h : p[j] - h;
    const d = q[j] - p[j], r1 = resid(q), col = new Float64Array(r0.length);
    for (let k = 0; k < r0.length; k++) col[k] = (r1[k] - r0[k]) / d;
    J.push(col);
  }
  return J;
}
const jtj = (J) => J.map((a) => J.map((b) => { let s = 0; for (let k = 0; k < a.length; k++) s += a[k] * b[k]; return s; }));

function lsq(resid, p0, lo, hi, maxIter = 80) {
  const n = p0.length, clamp = (v, i) => Math.min(hi[i], Math.max(lo[i], v));
  let p = p0.map(clamp), r = resid(p), cost = ssq(r), lam = 1e-2;
  for (let it = 0; it < maxIter; it++) {
    const J = jacobian(resid, p, r, lo, hi), A = jtj(J), g = J.map((col) => { let s = 0; for (let k = 0; k < r.length; k++) s += col[k] * r[k]; return s; });
    let improved = false, done = false;
    for (let tries = 0; tries < 14; tries++) {
      const Ad = A.map((row, i) => row.map((v, j) => (i === j ? v + lam * (A[i][i] || 1) : v)));
      const dp = solve(Ad, g.map((v) => -v));
      if (!dp) { lam *= 10; continue; }
      const pn = p.map((v, i) => clamp(v + dp[i], i)), rn = resid(pn), cn = ssq(rn);
      if (Number.isFinite(cn) && cn < cost) {
        done = (cost - cn) / (cost + 1e-300) < 1e-10;
        p = pn; r = rn; cost = cn; lam = Math.max(lam / 5, 1e-9); improved = true; break;
      }
      lam *= 5;
    }
    if (!improved || done) break;
  }
  return { p, r, cost };
}

// ------------------------------------------------------------------ fits
function fitGroup(runs, bulk) {
  const nb = bulk ? 1 : 0;
  const lo = [Math.log(1e2), Math.log(1e-5), Math.log(1e-4), ...(nb ? [-0.5] : [])];
  const hi = [Math.log(1e8), Math.log(10), Math.log(20), ...(nb ? [0.5] : [])];
  const mk = (rs) => {
    const total = rs.reduce((s, r) => s + r.t.length, 0), bufs = rs.map((r) => new Float64Array(r.t.length));
    return (p) => {
      const out = new Float64Array(total); let o = 0;
      rs.forEach((r, i) => { const m = sim(Math.exp(p[0]), Math.exp(p[1]), Math.exp(p[2]), nb ? p[3] : 0, r, bufs[i]); for (let k = 0; k < m.length; k++) out[o + k] = m[k] - r.y[k]; o += m.length; });
      return out;
    };
  };
  const full = mk(runs), coarse = mk(runs.map((r) => decimate(r, 5)));
  let ymax = 0; for (const r of runs) for (let i = 0; i < r.y.length; i++) if (r.y[i] > ymax) ymax = r.y[i];
  const starts = [];
  for (const k0 of [1e3, 1e4, 1e5, 1e6]) for (const f0 of [1e-3, 1e-2, 1e-1, 1]) {
    const p0 = [Math.log(k0), Math.log(f0), Math.log(Math.max(ymax, 0.02) * 2), ...(nb ? [0.02] : [])];
    try { starts.push(lsq(coarse, p0, lo, hi, 40)); } catch { /* skip */ }
  }
  starts.sort((a, b) => a.cost - b.cost);
  let best = null;
  for (const s of starts.slice(0, 3)) { const f = lsq(full, s.p, lo, hi, 60); if (!best || f.cost < best.cost) best = f; }
  if (!best) throw new Error("fit failed");
  const [kon, koff, rmax] = [Math.exp(best.p[0]), Math.exp(best.p[1]), Math.exp(best.p[2])], ri = nb ? best.p[3] : 0;
  let yall = [], n = 0, sy = 0; for (const r of runs) { for (let i = 0; i < r.y.length; i++) { sy += r.y[i]; n++; } }
  const ym = sy / n; let sst = 0; for (const r of runs) for (let i = 0; i < r.y.length; i++) sst += (r.y[i] - ym) ** 2;
  const dof = Math.max(n - best.p.length, 1);
  let seK = NaN, seF = NaN, seKd = NaN;
  const J = jacobian(full, best.p, best.r, lo, hi), C = invert(jtj(J).map((row, i) => row.map((v, j) => (i === j ? v * (1 + 1e-12) : v))));
  if (C) { const s2 = best.cost / dof; seK = Math.sqrt(Math.max(C[0][0] * s2, 0)); seF = Math.sqrt(Math.max(C[1][1] * s2, 0)); seKd = Math.sqrt(Math.max((C[0][0] + C[1][1] - 2 * C[0][1]) * s2, 0)); }
  const kd = (koff / kon) * 1e6;
  return {
    kon, koff, rmax, ri, r2: 1 - best.cost / sst, rmse: Math.sqrt(best.cost / n), konRse: seK, koffRse: seF, kdUM: kd,
    kdLo: kd * Math.exp(-1.96 * seKd), kdHi: kd * Math.exp(1.96 * seKd), fits: runs.map((r) => sim(kon, koff, rmax, ri, r, new Float64Array(r.t.length))),
  };
}

const lang = (c, rmax, kd) => (rmax * c) / (kd + c);
function steadyState(points, ri) {
  const c = points.map((p) => p[0]), r = points.map((p) => p[1] - ri);
  if (c.length < 3) return { ok: false, c, r };
  const best = (kd) => { let sf = 0, sff = 0; for (let i = 0; i < c.length; i++) { const f = c[i] / (kd + c[i]); sf += r[i] * f; sff += f * f; } const rm = Math.min(20, Math.max(0, sf / sff)); let ss = 0; for (let i = 0; i < c.length; i++) ss += (r[i] - lang(c[i], rm, kd)) ** 2; return { rm, ss }; };
  let bk = 1, bs = Infinity;
  for (let e = -4; e <= 4; e += 0.05) { const kd = 10 ** e, v = best(kd).ss; if (v < bs) { bs = v; bk = kd; } }
  let a = Math.log10(bk) - 0.05, b = Math.log10(bk) + 0.05; // golden-section refinement
  const gr = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 60; i++) { const c1 = b - gr * (b - a), c2 = a + gr * (b - a); if (best(10 ** c1).ss < best(10 ** c2).ss) b = c2; else a = c1; }
  const kd = 10 ** ((a + b) / 2), { rm, ss } = best(kd);
  let se = NaN;
  if (c.length > 2) {
    const J = [Float64Array.from(c, (x) => x / (kd + x)), Float64Array.from(c, (x) => (-rm * x) / (kd + x) ** 2)], C = invert(jtj(J));
    if (C) se = Math.sqrt(Math.max(C[1][1] * (ss / (c.length - 2)), 0));
  }
  return { ok: true, rmax: rm, kd, kdSe: se, c, r };
}

/** cfg: { mode, nPoints, bulk, refSubtract, normalize, sensors:[{name, include, reference, compound, conc}] } */
export function analyze(raw, info, cfg) {
  const rows = Object.fromEntries(cfg.sensors.map((s) => [s.name, s]));
  const refNames = cfg.sensors.filter((s) => s.reference).map((s) => s.name);
  if (cfg.refSubtract && !refNames.length) throw new Error("Reference subtraction is on but no reference sensor is selected");
  const by = Object.fromEntries(info.sensors.map((s) => [s.name, s]));
  const refFor = (n) => { if (!cfg.refSubtract) return null; const same = refNames.find((r) => by[r].exp === by[n].exp); return raw[same || refNames[0]]; };
  const sel = cfg.sensors.filter((s) => s.include && !s.reference).map((s) => s.name);
  if (!sel.length) throw new Error("No sensors selected");
  const groups = new Map();
  for (const n of sel) { const k = (rows[n].compound || "").trim() || `sensor ${n}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n); }
  const out = [];
  for (const [compound, names] of groups) {
    const runs = names.map((n) => {
      const conc = cfg.mode === "multi" && rows[n].conc !== "" && rows[n].conc != null ? Number(rows[n].conc) : null;
      const load = by[n].load, scale = cfg.normalize && load ? info.medianLoad / load : 1;
      return buildRun(raw[n], refFor(n), cfg.mode, cfg.nPoints || 99, conc, scale);
    });
    if (cfg.mode === "multi" && new Set(runs.map((r) => r.ends[0][0])).size < 2) throw new Error(`${compound}: need at least two different concentrations for a global fit`);
    if (cfg.mode === "single" && cfg.nPoints < 3) throw new Error("Use at least 3 concentration points");
    const isRep = cfg.mode === "single" && runs.length > 1;
    let fit, pts, ss, reps = null;
    if (isRep) {
      // replicate sensors of one compound: each is fitted on its own, then mean and SD are reported
      const fs = runs.map((r) => { try { return fitGroup([r], !!cfg.bulk); } catch (e) { throw new Error(`${compound} (${r.sensor}): ${e.message || e}`); } });
      const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, sd = (a) => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)) : NaN; };
      const col = (k) => fs.map((f) => f[k]);
      reps = fs.map((f, i) => ({ sensor: runs[i].sensor, kon: f.kon, koff: f.koff, kdUM: f.kdUM, rmax: f.rmax, r2: f.r2, ri: f.ri }));
      fit = {
        kon: mean(col("kon")), koff: mean(col("koff")), rmax: mean(col("rmax")), ri: mean(col("ri")), r2: mean(col("r2")), rmse: mean(col("rmse")),
        konRse: Math.max(...col("konRse").map((v) => (Number.isFinite(v) ? v : 0))), koffRse: Math.max(...col("koffRse").map((v) => (Number.isFinite(v) ? v : 0))),
        kdUM: mean(col("kdUM")), kdLo: NaN, kdHi: NaN, fits: fs.map((f) => f.fits[0]),
        sd: { kon: sd(col("kon")), koff: sd(col("koff")), kdUM: sd(col("kdUM")), rmax: sd(col("rmax")), r2: sd(col("r2")) }, nRep: fs.length, reps,
      };
      pts = runs.flatMap((r, i) => r.ends.map(([c, e]) => [c, e - fs[i].ri]));
      ss = steadyState(pts, 0);
    } else {
      fit = fitGroup(runs, !!cfg.bulk);
      pts = runs.flatMap((r) => r.ends);
      ss = steadyState(pts, fit.ri);
    }
    const concs = [...new Set(pts.map((p) => +p[0].toFixed(6)))].sort((a, b) => a - b);
    const flags = [];
    if (isRep) { const bad = reps.filter((r) => r.r2 < 0.9).length; if (bad) flags.push(`R² < 0.90 in ${bad} of ${reps.length}`); if (fit.sd.kdUM / fit.kdUM > 0.5) flags.push("replicates vary (KD CV > 50%)"); }
    else if (fit.r2 < 0.9) flags.push("R² < 0.90");
    if (fit.kdUM > concs[concs.length - 1]) flags.push("KD above top conc. (not saturated)");
    if (fit.konRse > 0.5 || fit.koffRse > 0.5) flags.push("kon/koff poorly determined");
    if (ss.ok && !(ss.kd / fit.kdUM >= 1 / 3 && ss.kd / fit.kdUM <= 3)) flags.push("kinetic vs steady-state KD differ >3x");
    if (names.some((n) => by[n].lowLoad)) flags.push("low loading sensor");
    if (concs.length < 4) flags.push("few concentrations");
    out.push({ compound, sensors: names.join(", "), nPoints: concs.length, concMin: concs[0], concMax: concs[concs.length - 1], ...fit, ss, flags: flags.join("; "), runs });
  }
  return {
    results: out,
    settings: { mode: cfg.mode, nPoints: cfg.mode === "single" ? cfg.nPoints : 1, reference: cfg.refSubtract ? refNames.join(", ") : "none", bulk: !!cfg.bulk, normalize: !!cfg.normalize,
      excluded: cfg.sensors.filter((s) => !s.include && !s.reference).map((s) => s.name) },
  };
}

// ------------------------------------------------------------------ tables
const g3 = (v) => (v == null || Number.isNaN(v) ? "–" : String(+Number(v).toPrecision(3)));
const g2 = (v) => (v == null || Number.isNaN(v) ? "–" : String(+Number(v).toPrecision(2)));
export const KD_HEAD = ["Compound", "Sensor(s)", "Conc. range (µM)", "kon (1/Ms)", "koff (1/s)", "KD kin. (µM)", "95% CI / n", "KD SS (µM)", "Rmax (nm)", "Bulk (nm)", "R²", "Flags"];
const pm = (m, sdv, f2 = g3, f1 = g2) => `${f2(m)} ± ${f1(sdv)}`;
export const kdRows = (results) => results.map((r) => {
  const R = r.nRep > 1;
  return [
    r.compound, r.sensors, `${g3(r.concMin)}–${g3(r.concMax)} (n=${r.nPoints})`,
    R ? `${r.kon.toExponential(2)} ± ${r.sd.kon.toExponential(1)}` : r.kon.toExponential(2), R ? `${r.koff.toExponential(2)} ± ${r.sd.koff.toExponential(1)}` : r.koff.toExponential(2),
    R ? pm(r.kdUM, r.sd.kdUM) : g3(r.kdUM), R ? `n = ${r.nRep} (SD)` : `${g2(r.kdLo)}–${g2(r.kdHi)}`, r.ss.ok ? `${g3(r.ss.kd)} ± ${g2(r.ss.kdSe)}` : "–",
    R ? pm(r.rmax, r.sd.rmax, (v) => v.toFixed(3), (v) => v.toFixed(3)) : r.rmax.toFixed(3), r.ri.toFixed(3), r.r2.toFixed(3), r.flags,
  ];
});
export const toCsv = (rows) => [KD_HEAD, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

// ------------------------------------------------------------------ figures (SVG with concrete colours so svg2pdf can embed them)
const K = { ink: "#17181A", muted: "#666b72", line: "#e6e6e6", cream: "#FAF6EB", data: "#9aa0a8", fit: "#d97f00", dark: "#8A5E0A" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r1 = (v) => Math.round(v * 10) / 10;
const fmtC = (uM) => (uM < 1 ? `${+(uM * 1000).toPrecision(3)} nM` : `${+uM.toPrecision(3)} µM`);
function ticksLin(lo, hi, n = 5) {
  const step0 = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(step0)), nm = step0 / mag, step = (nm < 1.5 ? 1 : nm < 3 ? 2 : nm < 7 ? 5 : 10) * mag, out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(10));
  return out;
}
const ticksLog = (lo, hi) => { const o = []; for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) { const v = 10 ** e; if (v >= lo * 0.999 && v <= hi * 1.001) o.push(v); } return o; };
const fmtT = (v) => String(+Number(v).toPrecision(6));

function panel(o) {
  const lx = (v) => Math.log10(v);
  const sx = o.xlog ? (v) => o.x + ((lx(v) - lx(o.xr[0])) / (lx(o.xr[1]) - lx(o.xr[0]))) * o.w : (v) => o.x + ((v - o.xr[0]) / (o.xr[1] - o.xr[0])) * o.w;
  const sy = (v) => o.y + o.h - ((v - o.yr[0]) / (o.yr[1] - o.yr[0])) * o.h;
  const xt = o.xlog ? ticksLog(o.xr[0], o.xr[1]) : ticksLin(o.xr[0], o.xr[1], 6), yt = ticksLin(o.yr[0], o.yr[1], 4);
  let pre = `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="#ffffff"/>`;
  for (const v of yt) pre += `<line x1="${o.x}" x2="${o.x + o.w}" y1="${r1(sy(v))}" y2="${r1(sy(v))}" stroke="#eeeeee" stroke-width="1"/>`;
  let post = `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="none" stroke="#c9c6bc" stroke-width="1"/>`;
  for (const v of xt) post += `<line x1="${r1(sx(v))}" x2="${r1(sx(v))}" y1="${o.y + o.h}" y2="${o.y + o.h + 4}" stroke="#8a8f98"/><text x="${r1(sx(v))}" y="${o.y + o.h + 15}" font-size="10" text-anchor="middle" fill="${K.muted}">${fmtT(v)}</text>`;
  for (const v of yt) post += `<line x1="${o.x - 4}" x2="${o.x}" y1="${r1(sy(v))}" y2="${r1(sy(v))}" stroke="#8a8f98"/><text x="${o.x - 7}" y="${r1(sy(v)) + 3.5}" font-size="10" text-anchor="end" fill="${K.muted}">${fmtT(v)}</text>`;
  post += `<text x="${o.x + o.w / 2}" y="${o.y + o.h + 30}" font-size="10.5" text-anchor="middle" fill="${K.ink}">${esc(o.xlabel)}</text>`;
  post += `<text transform="rotate(-90 ${o.x - 40} ${o.y + o.h / 2})" x="${o.x - 40}" y="${o.y + o.h / 2}" font-size="10.5" text-anchor="middle" fill="${K.ink}">${esc(o.ylabel)}</text>`;
  return { sx, sy, pre, post };
}
function poly(t, y, sx, sy, k, color, w, dash) {
  let d = ""; for (let i = 0; i < t.length; i += k) d += `${r1(sx(t[i]))},${r1(sy(y[i]))} `;
  return `<polyline points="${d.trim()}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}
const range = (arrs, pad = 0.07) => { let lo = Infinity, hi = -Infinity; for (const a of arrs) for (let i = 0; i < a.length; i++) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; } const d = (hi - lo) || 1; return [lo - d * pad, hi + d * pad]; };
const mix = (a, b, f) => "#" + [0, 2, 4].map((i) => Math.round(parseInt(a.slice(1 + i, 3 + i), 16) * (1 - f) + parseInt(b.slice(1 + i, 3 + i), 16) * f).toString(16).padStart(2, "0")).join("");

// o: { W (layout units, default 960), H (total height in the same units, default natural), title (bool), panels: "both" | "kinetics" | "ss" }
const REP_COL = ["#3B8EDB", "#2E9E72", "#B07AC6", "#D9534F", "#8A6D3B", "#2AA3A3", "#E0709B", "#9AA03A"];
const cat2 = (a, b) => { const o = new Float64Array(a.length + b.length); o.set(a, 0); o.set(b, a.length); return o; };
// mean and SD of the end-of-association responses at each concentration (replicates sit within ~6 % of each other in concentration)
function groupPts(c, r) {
  const g = new Map();
  c.forEach((x, i) => { const k = Math.round(Math.log10(x) * 40); if (!g.has(k)) g.set(k, []); g.get(k).push([x, r[i]]); });
  return [...g.values()].map((a) => { const n = a.length, mc = Math.exp(a.reduce((q, p) => q + Math.log(p[0]), 0) / n), my = a.reduce((q, p) => q + p[1], 0) / n; return { c: mc, y: my, n, sd: n > 1 ? Math.sqrt(a.reduce((q, p) => q + (p[1] - my) ** 2, 0) / (n - 1)) : 0, pts: a }; }).sort((p, q) => p.c - q.c);
}

export function figureSvg(res, mode, o = {}) {
  const W = o.W || 960, withTitle = o.title !== false, panels = o.panels || "both", showK = panels !== "ss", showS = panels !== "kinetics";
  const runs = res.runs, rep = mode === "single" && runs.length > 1, overlay = mode === "multi" || rep;
  const nP = !overlay && showK ? runs.length : 1, gap = 60;
  const legRows = overlay && showK ? Math.ceil(runs.length / 5) : 0;
  const ly0 = withTitle ? 50 : 12;
  const top = ly0 + legRows * 15 + (!overlay && showK ? (withTitle ? 18 : 20) : rep && showK ? 14 : withTitle ? 0 : 20);
  let ph = !overlay && showK ? 165 : 235;
  if (o.H) ph = Math.max(50, !overlay && showK ? (o.H - top - 40 + gap) / nP - gap : o.H - top - 40);
  const H = top + nP * (ph + gap) - gap + 40;
  const x0 = 62, sw = panels === "ss" ? W - 62 - 16 : 190, sx0 = panels === "ss" ? 62 : W - 212, pw = showS ? W - 364 : W - 62 - 16;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  s += `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
  const R = res.nRep > 1, e3 = (v) => v.toExponential(2);
  if (withTitle) s += `<text x="8" y="18" font-size="13" font-weight="bold" fill="${K.ink}">${esc(res.compound)}   KD (kinetic) = ${g3(res.kdUM)}${R ? ` ± ${g2(res.sd.kdUM)} µM (n = ${res.nRep})` : ` µM [${g2(res.kdLo)}–${g2(res.kdHi)}]`}   R² = ${res.r2.toFixed(3)}</text>`;
  if (withTitle) s += `<text x="8" y="34" font-size="10.5" fill="${K.muted}">kon = ${e3(res.kon)}${R ? ` ± ${res.sd.kon.toExponential(1)}` : ""} /Ms   koff = ${e3(res.koff)}${R ? ` ± ${res.sd.koff.toExponential(1)}` : ""} /s   Rmax = ${res.rmax.toFixed(3)} nm   bulk = ${res.ri.toFixed(3)} nm   ·  1:1 ${R ? "fit per sensor, mean ± SD" : "global fit"}</text>`;
  const concsAll = [...new Set(runs.map((r) => r.ends[0][0]))].sort((a, b) => a - b);
  const full = (run, fit) => ({ t: cat2(run.pre.t, run.t), y: cat2(run.pre.y, run.y), f: cat2(new Float64Array(run.pre.t.length), fit) });
  if (!showK) { /* steady-state only */ } else if (!overlay) {
    runs.forEach((run, i) => {
      const y = top + i * (ph + gap), F = full(run, res.fits[i]);
      const p = panel({ x: x0, y, w: pw, h: ph, xr: [F.t[0], F.t[F.t.length - 1]], yr: range([F.y, F.f]), xlabel: "Time (s)", ylabel: "Response (nm)" });
      s += p.pre;
      for (const [a, b] of run.bounds) if (run.c[a] > 0) {
        const xa = p.sx(run.t[a]), xb = p.sx(run.t[b - 1]);
        s += `<rect x="${r1(xa)}" y="${y}" width="${r1(xb - xa)}" height="${ph}" fill="${K.cream}" opacity="0.9"/><text x="${r1((xa + xb) / 2)}" y="${y - 5}" font-size="9" text-anchor="middle" fill="${K.muted}">${fmtC(run.c[a] * 1e6)}</text>`;
      }
      s += poly(F.t, F.y, p.sx, p.sy, 3, K.data, 1) + poly(F.t, F.f, p.sx, p.sy, 3, K.fit, 1.6) + p.post;
      s += `<text x="${x0}" y="${y - 19}" font-size="11" font-weight="bold" fill="${K.ink}">${esc(run.sensor)}</text>`;
      if (i === 0) s += `<line x1="${x0 + 80}" x2="${x0 + 100}" y1="${y - 22}" y2="${y - 22}" stroke="${K.data}" stroke-width="2"/><text x="${x0 + 104}" y="${y - 19}" font-size="10" fill="${K.muted}">data</text><line x1="${x0 + 140}" x2="${x0 + 160}" y1="${y - 22}" y2="${y - 22}" stroke="${K.fit}" stroke-width="2.4"/><text x="${x0 + 164}" y="${y - 19}" font-size="10" fill="${K.muted}">1:1 fit</text>`;
    });
  } else {
    const y = top, t0s = runs.map((r) => r.t[r.bounds[0][0]]);
    const F = runs.map((r, i) => { const f = full(r, res.fits[i]); return { ...f, t: Float64Array.from(f.t, (v) => v - t0s[i]) }; });
    const p = panel({ x: x0, y, w: pw, h: ph, xr: [Math.min(...F.map((f) => f.t[0])), Math.max(...F.map((f) => f.t[f.t.length - 1]))], yr: range(F.flatMap((f) => [f.y, f.f])), xlabel: "Time from association start (s)", ylabel: "Response (nm)" });
    s += p.pre;
    if (rep) for (const [a, b] of runs[0].bounds) if (runs[0].c[a] > 0) {
      const xa = p.sx(runs[0].t[a] - t0s[0]), xb = p.sx(runs[0].t[b - 1] - t0s[0]);
      s += `<rect x="${r1(xa)}" y="${y}" width="${r1(xb - xa)}" height="${ph}" fill="${K.cream}" opacity="0.9"/><text x="${r1((xa + xb) / 2)}" y="${y - 5}" font-size="9" text-anchor="middle" fill="${K.muted}">${fmtC(runs[0].c[a] * 1e6)}</text>`;
    }
    const col = (i) => (rep ? REP_COL[i % REP_COL.length] : mix("#f2c36b", "#4a2c00", concsAll.length > 1 ? concsAll.indexOf(runs[i].ends[0][0]) / (concsAll.length - 1) : 0.5));
    runs.forEach((run, i) => {
      const c = col(i);
      s += poly(F[i].t, F[i].y, p.sx, p.sy, 3, c, 1) + poly(F[i].t, F[i].f, p.sx, p.sy, 3, K.ink, 1, "4 3");
      s += `<line x1="${x0 + (i % 5) * 118}" x2="${x0 + (i % 5) * 118 + 16}" y1="${ly0 + Math.floor(i / 5) * 15 - 4}" y2="${ly0 + Math.floor(i / 5) * 15 - 4}" stroke="${c}" stroke-width="2.4"/><text x="${x0 + (i % 5) * 118 + 20}" y="${ly0 + Math.floor(i / 5) * 15}" font-size="10" fill="${K.muted}">${rep ? `Repeat ${i + 1} (${esc(run.sensor)})` : esc(run.sensor) + " · " + fmtC(run.ends[0][0])}</text>`;
    });
    s += p.post;
  }
  if (showS) {
  // steady-state panel: mean ± SD where a concentration was measured more than once
  const ss = res.ss, G = groupPts(ss.c, ss.r), hasSd = G.some((g) => g.n > 1);
  const cs = ss.c, rv = ss.r;
  const xr = [Math.min(...cs) / 2.5, Math.max(...cs) * 2.5], yTop = Math.max(...G.map((g) => g.y + g.sd), ...rv, ss.ok ? ss.rmax * 0.9 : 0);
  const sp = panel({ x: sx0, y: top, w: sw, h: ph, xr, yr: [Math.min(0, ...rv) - 0.02, yTop * 1.12], xlog: true, xlabel: "Analyte (µM)", ylabel: "End-of-association response (nm)" });
  s += `<text x="${sx0}" y="${top - 19}" font-size="11" font-weight="bold" fill="${K.ink}">Steady-state (bulk removed)</text>` + sp.pre;
  if (ss.ok) { let d = ""; for (let i = 0; i <= 80; i++) { const c = 10 ** (Math.log10(xr[0]) + ((Math.log10(xr[1]) - Math.log10(xr[0])) * i) / 80); d += `${r1(sp.sx(c))},${r1(sp.sy(lang(c, ss.rmax, ss.kd)))} `; } s += `<polyline points="${d.trim()}" fill="none" stroke="${K.fit}" stroke-width="1.6"/>`; }
  for (const g of G) {
    const cx = r1(sp.sx(g.c));
    if (g.n > 1) {
      for (const q of g.pts) s += `<circle cx="${r1(sp.sx(q[0]))}" cy="${r1(sp.sy(q[1]))}" r="2" fill="#ffffff" stroke="${K.muted}" stroke-width="0.8"/>`;
      const ya = r1(sp.sy(g.y + g.sd)), yb = r1(sp.sy(g.y - g.sd));
      s += `<line x1="${cx}" x2="${cx}" y1="${ya}" y2="${yb}" stroke="${K.ink}" stroke-width="1"/><line x1="${r1(cx - 3.5)}" x2="${r1(cx + 3.5)}" y1="${ya}" y2="${ya}" stroke="${K.ink}" stroke-width="1"/><line x1="${r1(cx - 3.5)}" x2="${r1(cx + 3.5)}" y1="${yb}" y2="${yb}" stroke="${K.ink}" stroke-width="1"/>`;
    }
    s += `<circle cx="${cx}" cy="${r1(sp.sy(g.y))}" r="3.6" fill="${K.ink}"/>`;
  }
  s += sp.post;
  s += ss.ok ? `<text x="${sx0 + sw - 6}" y="${top + ph - (hasSd ? 22 : 9)}" font-size="10" text-anchor="end" fill="${K.dark}">KD = ${g3(ss.kd)} ± ${g2(ss.kdSe)} µM</text>` : `<text x="${sx0 + sw / 2}" y="${top + ph / 2}" font-size="10" text-anchor="middle" fill="${K.muted}">too few points</text>`;
  if (hasSd) s += `<text x="${sx0 + sw - 6}" y="${top + ph - 9}" font-size="9" text-anchor="end" fill="${K.muted}">mean ± SD, n = ${Math.max(...G.map((g) => g.n))}</text>`;
  }
  return s + "</svg>";
}
