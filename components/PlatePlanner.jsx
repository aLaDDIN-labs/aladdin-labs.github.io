"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CU, sig, fVol, letters, toCSV, dilutionPlan, bufferRow, platePlan, doseLayout, seriesFor, SNAPS, PAL, rowLetters } from "../lib/platetools";

const KEY = "platePlannerV1";
const dl = (href, name) => { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
const blobUrl = (t, type) => URL.createObjectURL(new Blob([t], { type }));
const uid = () => "x" + Math.random().toString(36).slice(2, 8);
const CUNITS = CU.map((c) => c[0]);
const STEP_T = [["baseline", "Baseline (buffer)"], ["loading", "Loading (ligand)"], ["assoc", "Association (analyte)"], ["dissoc", "Dissociation (buffer)"], ["regen", "Regeneration"], ["custom", "Other solution"]];
const BUF_UNITS = ["x", "%", "M", "mM", "µM", "mg/mL"];

const Num = ({ v, set, w = 84, min }) => <input className="pp-in" type="number" step="any" min={min} value={v} style={{ width: w }} onChange={(e) => set(e.target.value === "" ? "" : +e.target.value)} />;
const Txt = ({ v, set, w = 130, ph }) => <input className="pp-in" type="text" value={v} placeholder={ph} style={{ width: w }} onChange={(e) => set(e.target.value)} />;
const Sel = ({ v, set, opts, w }) => <select className="pp-in" value={v} style={w ? { width: w } : undefined} onChange={(e) => set(e.target.value)}>{opts.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}</select>;
const Fld = ({ t, children }) => <label className="pp-fld"><span>{t}</span><span className="pp-ctl">{children}</span></label>;

const mkSteps = (kind, a) => {
  const A = a[0]?.id, B = a[1]?.id || a[0]?.id;
  if (kind === "single") return [{ t: "baseline" }, { t: "loading" }, { t: "baseline" }, { t: "assoc", a: A }, { t: "dissoc" }];
  if (kind === "two") return [{ t: "baseline" }, { t: "loading" }, { t: "baseline" }, { t: "assoc", a: A }, { t: "dissoc" }, { t: "assoc", a: B }, { t: "dissoc" }];
  return [{ t: "baseline" }, { t: "loading" }, { t: "baseline" }, { t: "assoc", a: A }, { t: "dissoc" }, { t: "regen", label: "10 mM Glycine pH 2.0" }, { t: "baseline", label: "" }];
};
const A1 = { id: "a1", name: "Len", stock: 100, stockU: "mM", top: 25, topU: "µM" };
const A2 = { id: "a2", name: "Cpd01", stock: 100, stockU: "mM", top: 25, topU: "µM" };

const DEF = {
  dil: { stock: 100, stockU: "mM", top: 25, topU: "µM", factor: 2, points: 6, blank: true, dmso: 1, method: "buffer", vUse: 500, vBlank: 500, vInt: 0 },
  buf: {
    vFinal: 50,
    comps: [
      { id: "pbs", name: "10x PBS", unit: "x", stock: 10 }, { id: "tw", name: "10% Tween", unit: "%", stock: 10 }, { id: "tr", name: "10% Triton", unit: "%", stock: 10 },
      { id: "bsa", name: "10% BSA", unit: "%", stock: 10 }, { id: "ova", name: "10% Ovalbumin", unit: "%", stock: 10 }, { id: "nacl", name: "5M NaCl", unit: "mM", stock: 5000 }, { id: "dmso", name: "100% DMSO", unit: "%", stock: 100 },
    ],
    conds: [
      { id: "c1", name: "Cond 1", desc: "PBST (0.05% Tween) + 1% DMSO (Control)", v: { pbs: 1, tw: 0.05, dmso: 1 } },
      { id: "c2", name: "Cond 2", desc: "PBST (0.10% Tween) + 1% DMSO", v: { pbs: 1, tw: 0.1, dmso: 1 } },
      { id: "c3", name: "Cond 3", desc: "PBS + 0.05% Triton X-100 + 1% DMSO", v: { pbs: 1, tr: 0.05, dmso: 1 } },
      { id: "c4", name: "Cond 4", desc: "Cond 1 + 0.1% BSA", v: { pbs: 1, tw: 0.05, bsa: 0.1, dmso: 1 } },
      { id: "c5", name: "Cond 5", desc: "Cond 1 + 0.5% BSA", v: { pbs: 1, tw: 0.05, bsa: 0.5, dmso: 1 } },
      { id: "c6", name: "Cond 6", desc: "Cond 1 + 0.1% Ovalbumin", v: { pbs: 1, tw: 0.05, ova: 0.1, dmso: 1 } },
      { id: "c7", name: "Cond 7", desc: "Cond 1 + 150 mM NaCl on top of PBS", v: { pbs: 1, tw: 0.05, nacl: 150, dmso: 1 } },
      { id: "c8", name: "Cond 8", desc: "Cond 3 + 0.1% BSA", v: { pbs: 1, tr: 0.05, bsa: 0.1, dmso: 1 } },
    ],
  },
  lay: { mode: "dose", plate: 96, orient: "row", nComp: 4, names: "", points: 8, max: 10, min: 0.01, unit: "µM", snap: "exact", reps: 2, repMode: "adjacent", edge: true, fillEdge: true, veh: 1, pos: 1, sensors: "shared", blank: true, useRef: true, nRef: 1 },
  bli: {
    wellVol: 200, extra: 40, dmso: 1, method: "buffer", points: 6, factor: 2, blank: true, useRef: true, refName: "Biotin", startCol: 1, kin: "multi", refRows: [],
    ligand: { name: "Bio-CRBN", load: 10, loadU: "µg/mL", stock: 1000 },
    analytes: [A1, A2], steps: mkSteps("two", [A1, A2]),
  },
};

function PrepTable({ plan, name }) {
  if (!plan) return null;
  if (plan.error) return <p className="pv-err" role="alert">{plan.error}</p>;
  const csv = () => dl(blobUrl(toCSV([["Step", "ID", "Final concentration", "How to prepare", "Volume made (µL)"], ...plan.sections.flatMap((s) => s.rows.map((r) => [s.title, r.id, r.conc, r.how, +r.vol.toFixed(2)]))]), "text/csv"), `${name || "dilution"}_prep.csv`);
  return (
    <div className="pp-prep">
      {plan.warns.map((w, i) => <p key={i} className="me-flag warn">{w}</p>)}
      {plan.sections.map((s) => (
        <div key={s.title}>
          <p className="pv-lbl">{s.title}</p>
          <div className="sq-scroll"><table className="sq-table"><thead><tr><th>ID</th><th>Final conc.</th><th>How to prepare</th><th>Volume made</th></tr></thead><tbody>
            {s.rows.map((r) => <tr key={r.id}><td><b>{r.id}</b></td><td>{r.conc}</td><td>{r.how}</td><td>{fVol(r.vol)}</td></tr>)}
          </tbody></table></div>
        </div>
      ))}
      <p className="pv-small">Total from the stock {fVol(plan.tot.stock)} · DMSO {fVol(plan.tot.dmso)} · buffer without DMSO {fVol(plan.tot.buf0)}{plan.aq ? "" : ` · buffer with DMSO ${fVol(plan.tot.bufD)}`}. Volumes include the extra needed for pipetting.</p>
      <div className="pv-row"><button className="pv-chip" onClick={csv}>Download CSV</button></div>
    </div>
  );
}

const KC = { buf: "#EFEBDD", load: "#CDEBDC", ref: "#E2EFD8", blank: "#F4EFE0", refassoc: "#F5D6D6", regen: "#E3E0F7", custom: "#E7E7E7" };
const assocFill = (rank) => { const a = [253, 233, 196], b = [243, 152, 0]; const t = 1 - rank * 0.85; return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t))})`; };
const bliCells = (plan) => plan.wells.map((w) => ({ ...w, fill: w.kind === "assoc" ? assocFill(w.rank) : KC[w.kind] || "#eee" }));
const bliHeads = (plan, cfg) => { const h = {}; const an = (id) => cfg.analytes.find((a) => a.id === id); plan.steps.forEach((s) => { h[s.col] = s.t === "assoc" ? s.hd || an(s.a)?.name || "Analyte" : s.t === "baseline" ? "Baseline" : s.t === "loading" ? "Loading" : s.t === "dissoc" ? "Dissoc." : s.t === "regen" ? "Regen." : "Other"; }); return h; };
const cut = (t, n) => (String(t).length > n ? String(t).slice(0, n - 1) + "…" : String(t));

const ShapeToggle = ({ shape, set }) => (
  <span className="pp-shape" role="group" aria-label="Well shape">
    <button className={shape === "round" ? "on" : ""} onClick={() => set("round")}>Round</button>
    <button className={shape === "square" ? "on" : ""} onClick={() => set("square")}>Square</button>
  </span>
);

function PlateView({ rows, cols, cells, heads, shape, sel, onSel, svgRef }) {
  const big = cols > 12, CW = big ? 38 : 76, CH = big ? 38 : 60, X0 = 34, Y0 = heads ? 56 : 30;
  const map = new Map(cells.map((w) => [w.row + "-" + w.col, w]));
  const r = Math.min(CW, CH) / 2 - (big ? 3 : 4);
  return (
    <svg ref={svgRef} viewBox={`0 0 ${X0 + cols * CW + 10} ${Y0 + rows * CH + 10}`} fontFamily="Inter, system-ui, sans-serif" role="img" aria-label={`${rows * cols}-well plate layout`}>
      <rect width="100%" height="100%" fill="#fff" />
      {Array.from({ length: cols }, (_, c) => (
        <g key={c}><text x={X0 + c * CW + CW / 2} y={18} textAnchor="middle" fontSize={big ? 10 : 12} fill="#5F636B">{c + 1}</text>
          {heads?.[c] && <text x={X0 + c * CW + CW / 2} y={36} textAnchor="middle" fontSize="11" fontWeight="600" fill="#17181A">{cut(heads[c], 10)}</text>}</g>
      ))}
      {Array.from({ length: rows }, (_, i) => <text key={i} x={16} y={Y0 + i * CH + CH / 2 + 4} textAnchor="middle" fontSize={big ? 10 : 12} fill="#5F636B">{rowLetters[i]}</text>)}
      {Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, c) => {
        const w = map.get(i + "-" + c); const on = sel && sel.row === i && sel.col === c; const cx = X0 + c * CW + CW / 2, cy = Y0 + i * CH + CH / 2;
        const stroke = on ? "#17181A" : w ? "#CFC8B3" : "#E4E0D2", sw = on ? 2.4 : 1;
        return (
          <g key={i + "-" + c} onClick={() => w && onSel(w)} style={{ cursor: w ? "pointer" : "default" }}>
            {shape === "square" ? <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} rx="8" fill={w ? w.fill : "#fff"} stroke={stroke} strokeWidth={sw} /> : <circle cx={cx} cy={cy} r={r} fill={w ? w.fill : "#fff"} stroke={stroke} strokeWidth={sw} />}
            {!big && w && w.text && <text x={cx} y={cy + (w.sub ? -1 : 4)} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#17181A">{cut(w.text, 8)}</text>}
            {!big && w && w.sub && <text x={cx} y={cy + 11} textAnchor="middle" fontSize="9" fill="#44474D">{cut(w.sub, 9)}</text>}
          </g>
        );
      }))}
    </svg>
  );
}

export default function PlatePlanner() {
  const [tab, setTab] = useState("lay");
  const [dil, setDil] = useState(DEF.dil);
  const [buf, setBuf] = useState(DEF.buf);
  const [bli, setBli] = useState(DEF.bli);
  const [lay, setLay] = useState(DEF.lay);
  const [shape, setShape] = useState("round");
  const [pg, setPg] = useState(0);
  const [sel, setSel] = useState(null);
  const [ready, setReady] = useState(false);
  const svgR = useRef(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState({ date: new Date().toLocaleDateString("sv-SE"), who: "", title: "", notes: "", sign: true });
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteErr, setNoteErr] = useState("");
  useEffect(() => { try { const w = localStorage.getItem("labNoteWho"); if (w) setNote((n) => ({ ...n, who: w })); } catch {} }, []);

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) { s.dil && setDil({ ...DEF.dil, ...s.dil }); s.buf && setBuf(s.buf); s.bli && setBli({ ...DEF.bli, ...s.bli }); s.lay && setLay({ ...DEF.lay, ...s.lay }); s.tab && setTab(s.tab); } } catch {} setReady(true); }, []);
  useEffect(() => { if (!ready) return; try { localStorage.setItem(KEY, JSON.stringify({ dil, buf, bli, lay, tab })); } catch {} }, [dil, buf, bli, lay, tab, ready]);

  const dPlan = useMemo(() => dilutionPlan({ ...dil, vBlank: dil.vUse }), [dil]);
  const bPlan = useMemo(() => platePlan(bli), [bli]);
  const single = bli.kin === "single";
  const sd = (k) => (v) => setDil((d) => ({ ...d, [k]: v }));
  const sb = (k) => (v) => setBli((d) => ({ ...d, [k]: v }));
  const sl = (k) => (v) => setBli((d) => ({ ...d, ligand: { ...d.ligand, [k]: v } }));

  // ---- layout designer
  const sL = (k) => (v) => { setLay((l) => ({ ...l, [k]: v })); setPg(0); setSel(null); };
  const lNames = lay.names.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
  const dose = useMemo(() => (lay.mode === "dose" ? doseLayout({ ...lay, names: lNames }) : null), [lay]);
  const ser = useMemo(() => seriesFor(+lay.max, +lay.min, lay.points, lay.snap), [lay.max, lay.min, lay.points, lay.snap]);
  const bliPlates = useMemo(() => {
    if (lay.mode !== "bli" || ser.error) return [];
    const n = Math.round(lay.nComp) || 1, nm = Array.from({ length: n }, (_, i) => lNames[i] || `Cpd${i + 1}`);
    const single = lay.sensors === "single", nRef = single && lay.useRef ? Math.max(1, Math.round(+lay.nRef || 1)) : 0;
    const per = single ? Math.max(1, 8 - (lay.blank ? 1 : 0) - nRef) : lay.sensors === "shared" ? 4 : 2, out = [];
    for (let k = 0; k < n; k += per) {
      const analytes = nm.slice(k, k + per).map((name, i) => ({ id: "d" + (k + i), name, stock: bli.analytes[0]?.stock ?? 100, stockU: bli.analytes[0]?.stockU ?? "mM", top: +lay.max, topU: lay.unit }));
      let steps = [];
      if (lay.sensors === "shared") { steps = [{ t: "baseline" }, { t: "loading" }, { t: "baseline" }]; analytes.forEach((a) => steps.push({ t: "assoc", a: a.id }, { t: "dissoc" })); }
      else if (!single) analytes.forEach((a) => steps.push({ t: "baseline" }, { t: "loading" }, { t: "baseline" }, { t: "assoc", a: a.id }, { t: "dissoc" }));
      const cfg = { ...bli, kin: single ? "single" : "multi", refRows: single ? Array.from({ length: nRef }, (_, i) => ({ a: analytes[i % analytes.length].id })) : [], points: ser.p, factor: ser.f, blank: lay.blank, useRef: lay.useRef, analytes, steps: single ? bli.steps : steps, startCol: 1 };
      out.push({ cfg, plan: platePlan(cfg) });
    }
    return out;
  }, [lay, bli]);
  const nPg = lay.mode === "dose" ? dose?.nPlates || 0 : bliPlates.length;
  const pgi = Math.min(pg, Math.max(0, nPg - 1));
  const layCSV = () => {
    const rows = [["Plate", "Well", "Role", "Compound", "Replicate", "Concentration", "Unit"]];
    if (lay.mode === "dose") dose.plates.forEach((pl, pi) => pl.slice().sort((a, b) => a.row - b.row || a.col - b.col).forEach((w) => rows.push([pi + 1, w.well, w.kind === "dose" ? "sample" : w.kind === "veh" ? "vehicle control" : w.kind === "pos" ? "positive control" : "edge (PBS)", w.kind === "dose" ? dose.names[w.comp] : "", w.rep || "", w.kind === "dose" ? sig(w.conc, 4) : "", w.kind === "dose" ? lay.unit : ""])));
    else bliPlates.forEach((bp, pi) => bp.plan.wells.slice().sort((a, b) => a.col - b.col || a.row - b.row).forEach((w) => rows.push([pi + 1, w.well, `${w.step + 1} ${w.t}`, w.an || w.full, "", w.conc != null ? sig(w.conc, 4) : "", w.cu || ""])));
    dl(blobUrl(toCSV(rows), "text/csv"), "plate_layout.csv");
  };
  const toDilution = () => { setDil((d) => ({ ...d, top: +lay.max, topU: lay.unit, factor: +sig(ser.f, 6), points: ser.p })); setTab("dil"); };

  // ---- buffer tab helpers
  const setComp = (id, k, v) => setBuf((b) => ({ ...b, comps: b.comps.map((c) => (c.id === id ? { ...c, [k]: v } : c)) }));
  const setCond = (id, k, v) => setBuf((b) => ({ ...b, conds: b.conds.map((c) => (c.id === id ? { ...c, [k]: v } : c)) }));
  const setVal = (id, cid, v) => setBuf((b) => ({ ...b, conds: b.conds.map((c) => (c.id === id ? { ...c, v: { ...c.v, [cid]: v } } : c)) }));
  const vF = (+buf.vFinal || 0) * 1000;
  const bufRows = buf.conds.map((c) => ({ c, ...bufferRow(vF, buf.comps, c.v) }));
  const bufCSV = () => dl(blobUrl(toCSV([["Buffer ID", "Description", ...buf.comps.map((c) => c.name), "ultrapure water", "Final volume"], ...bufRows.map((r) => [r.c.name, r.c.desc, ...r.parts.map((p) => (p > 0 ? fVol(p) : "–")), fVol(r.water), fVol(vF)])]), "text/csv"), "buffer_recipes.csv");

  // ---- BLI helpers
  const an = (id) => bli.analytes.find((a) => a.id === id);
  const setAn = (id, k, v) => setBli((b) => ({ ...b, analytes: b.analytes.map((a) => (a.id === id ? { ...a, [k]: v } : a)) }));
  const setStep = (i, k, v) => setBli((b) => ({ ...b, steps: b.steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const moveStep = (i, d) => setBli((b) => { const s = [...b.steps], j = i + d; if (j < 0 || j >= s.length) return b; [s[i], s[j]] = [s[j], s[i]]; return { ...b, steps: s }; });
  const addStep = (t) => setBli((b) => ({ ...b, steps: [...b.steps, t === "assoc" ? { t, a: b.analytes[0]?.id } : { t, label: "" }] }));
  const wellCSV = () => dl(blobUrl(toCSV([["Well", "Step", "Content", "Concentration", "Unit", "Volume (µL)"], ...bPlan.wells.slice().sort((a, b) => a.col - b.col || a.row - b.row).map((w) => [w.well, `${w.step + 1} ${w.t}`, w.full, w.conc != null ? sig(w.conc) : "", w.cu || "", w.vol])]), "text/csv"), "plate_wells.csv");
  const svgText = () => { const el = svgR.current.cloneNode(true); el.setAttribute("xmlns", "http://www.w3.org/2000/svg"); const vb = el.getAttribute("viewBox").split(" "); el.setAttribute("width", vb[2]); el.setAttribute("height", vb[3]); return new XMLSerializer().serializeToString(el); };
  const exportPlate = async (kind) => {
    if (kind === "svg") return dl(blobUrl(svgText(), "image/svg+xml"), "bli_plate.svg");
    const vb = svgR.current.getAttribute("viewBox").split(" ").map(Number); const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText()); await new Promise((r) => { img.onload = r; });
    const c = document.createElement("canvas"); c.width = vb[2] * 3; c.height = vb[3] * 3; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); dl(c.toDataURL("image/png"), "bli_plate.png");
  };

  // ---- Lab note PDF
  const TAB_T = { lay: "Plate layout", bli: "BLI plate", dil: "Dilution series", buf: "Buffer recipes" };
  const plateSvg = async (rows, cols, cells, heads) => { const { renderToStaticMarkup } = await import("react-dom/server"); return renderToStaticMarkup(<PlateView rows={rows} cols={cols} cells={cells} heads={heads} shape={shape} sel={null} onSel={() => {}} />); };
  const prepBlocks = (plan, label) => {
    if (!plan || plan.error) return [{ t: "p", text: plan?.error || "No plan." }];
    const out = [];
    plan.warns.forEach((w) => out.push({ t: "p", text: "Note: " + w }));
    plan.sections.forEach((sec) => out.push({ t: "table", title: label ? `${label} · ${sec.title}` : sec.title, head: ["ID", "Final conc.", "How to prepare", "Volume made"], rows: sec.rows.map((r) => [r.id, r.conc, r.how, fVol(r.vol)]), widths: [16, 30, 0, 26] }));
    out.push({ t: "p", text: `Total from the stock ${fVol(plan.tot.stock)} · DMSO ${fVol(plan.tot.dmso)} · buffer without DMSO ${fVol(plan.tot.buf0)}${plan.aq ? "" : ` · buffer with DMSO ${fVol(plan.tot.bufD)}`}. Volumes include the extra needed for pipetting.` });
    return out;
  };
  const noteBlocks = async () => {
    const B = [], lg = (cells) => cells;
    if (tab === "lay") {
      if (ser.error) return [{ t: "p", text: ser.error }];
      B.push({ t: "h", text: "Experiment" });
      B.push({ t: "kv", rows: [["Type", lay.mode === "bli" ? "BLI on an Octet" : "Concentration-dependent effect"], ["Compounds", `${Math.round(lay.nComp)}${lNames.length ? " (" + lNames.join(", ") + ")" : ""}`], ["Concentrations", `${ser.p} points, ${sig(ser.f, 3)}-fold, ${sig(+lay.max, 4)} to ${sig(ser.min, 4)} ${lay.unit}`], ...(lay.mode === "dose" ? [["Plate", `${lay.plate}-well, series ${lay.orient === "row" ? "along a row" : "down a column"}`], ["Replicates", `${lay.reps} (${lay.repMode === "adjacent" ? "next to each other" : "separate blocks"})`], ["Controls per series", `vehicle ${lay.veh}, positive ${lay.pos}`], ["Outer wells", lay.edge ? (lay.fillEdge ? "unused, filled with PBS or medium" : "unused") : "used"]] : [["Sensors", lay.sensors === "shared" ? "shared: one baseline and loading, then each compound" : "own sensors for each compound"], ["Blank / reference", `${lay.blank ? "blank row" : "no blank"}, ${lay.useRef ? "reference sensor in row H" : "no reference"}`]])] });
      B.push({ t: "h", text: "Concentration series" });
      B.push({ t: "table", head: ["#", ...ser.conc.map((_, k) => String(k + 1))], rows: [["Conc. (" + lay.unit + ")", ...ser.conc.map((c) => sig(c, 4))]], fontSize: 7 });
      if (lay.mode === "dose" && dose && !dose.error) {
        for (let pi = 0; pi < dose.nPlates; pi++) {
          B.push({ t: "svg", caption: `${lay.plate}-well plate${dose.nPlates > 1 ? " " + (pi + 1) + " of " + dose.nPlates : ""}`, svg: await plateSvg(dose.R, dose.C, dose.plates[pi]) });
          const items = dose.names.map((n, i) => [PAL[i % PAL.length], n]).concat([["#DADADA", "Vehicle"], ["#F4B6B6", "Positive"]]); if (lay.edge && lay.fillEdge) items.push(["#EDEAE0", "PBS or medium"]);
          B.push({ t: "legend", items });
          const by = new Map(); dose.plates[pi].filter((c) => c.kind === "dose").sort((a, b) => a.row - b.row || a.col - b.col).forEach((c) => { const k = c.comp + "-" + c.rep; if (!by.has(k)) by.set(k, { n: dose.names[c.comp], rep: c.rep, w: [] }); by.get(k).w.push(c); });
          const ctl = (kind) => { const l = dose.plates[pi].filter((c) => c.kind === kind).map((c) => c.well); return l.length ? l.join(", ") : "–"; };
          B.push({ t: "table", title: `Wells${dose.nPlates > 1 ? " · plate " + (pi + 1) : ""}`, head: ["Compound", "Rep.", "Wells, highest to lowest concentration"], rows: [...by.values()].map((v) => [v.n, v.rep, v.w.map((c) => c.well).join(", ")]).concat([["Vehicle control", "", ctl("veh")], ["Positive control", "", ctl("pos")]]), widths: [38, 14, 0], fontSize: 7.5 });
        }
      } else if (lay.mode === "bli") {
        for (let pi = 0; pi < bliPlates.length; pi++) {
          const bp = bliPlates[pi];
          B.push({ t: "svg", caption: `96-well plate${bliPlates.length > 1 ? " " + (pi + 1) + " of " + bliPlates.length : ""}`, svg: await plateSvg(8, 12, bliCells(bp.plan), bliHeads(bp.plan, bp.cfg)) });
          B.push({ t: "table", title: `Solutions${bliPlates.length > 1 ? " · plate " + (pi + 1) : ""}`, head: ["Solution", "Total volume", "How"], rows: bp.plan.sols.map((x) => [x.name, fVol(x.vol), x.how]), widths: [52, 26, 0] });
        }
      }
      B.push({ t: "h", text: "Dilutions" }); B.push({ t: "p", text: `Series of ${ser.p} points, ${sig(ser.f, 3)}-fold, from ${sig(+lay.max, 4)} ${lay.unit}. Open the Dilution series tab to get the pipetting volumes.` });
    } else if (tab === "bli") {
      B.push({ t: "h", text: "Settings" });
      B.push({ t: "kv", rows: [["Method", single ? `Single-cycle kinetics, ${bli.points} rising concentrations, one dissociation at the end` : "Multi-cycle kinetics"], ["Volume per well", `${bli.wellVol} µL (+ ${bli.extra} µL extra per solution)`], ["Buffer DMSO", `${bli.dmso} %`], ["Ligand", `${bli.ligand.name}, loaded at ${bli.ligand.load} ${bli.ligand.loadU} (stock ${bli.ligand.stock} ${bli.ligand.loadU})`], ["Series", `${bli.points} points, ${bli.factor}-fold${bli.blank ? ", blank row" : ""}${single ? `, ${(bli.refRows || []).length} reference sensor(s) without protein` : bli.useRef ? `, reference sensor (${bli.refName})` : ""}`], ["Dilution method", bli.method === "dmso" ? "in DMSO, then spike" : "in buffer with DMSO"], ["Analytes", bli.analytes.map((a) => `${a.name} (stock ${a.stock} ${a.stockU}, top ${a.top} ${a.topU})`).join("; ")]] });
      B.push({ t: "table", title: "Columns, in the order the sensors move", head: ["Col.", "Step", "Detail"], rows: bPlan.steps.map((st) => [st.col + 1, (STEP_T.find((x) => x[0] === st.t) || [0, st.t])[1], st.t === "assoc" ? st.hd || an(st.a)?.name || "" : st.label || ""]), widths: [14, 60, 0] });
      B.push({ t: "svg", caption: "96-well plate", svg: await plateSvg(8, 12, bliCells(bPlan), bliHeads(bPlan, bli)) });
      B.push({ t: "table", title: "Solutions to prepare", head: ["Solution", "Total volume", "How"], rows: bPlan.sols.map((x) => [x.name, fVol(x.vol), x.how]), widths: [52, 26, 0] });
      bPlan.warnings.forEach((w) => B.push({ t: "p", text: "Note: " + w }));
      bli.analytes.filter((a) => bPlan.plans[a.id]).forEach((a) => { B.push({ t: "h", text: `${a.name} · concentration series` }); B.push(...prepBlocks(bPlan.plans[a.id])); });
    } else if (tab === "dil") {
      B.push({ t: "h", text: "Dilution series" });
      B.push({ t: "kv", rows: [["Stock", `${dil.stock} ${dil.stockU}`], ["Top concentration", `${dil.top} ${dil.topU}`], ["Factor / points", `${dil.factor}-fold, ${dil.points} points`], ["DMSO", `${dil.dmso} %`], ["Method", dil.method === "dmso" ? "in DMSO, then spike" : "in buffer with DMSO"]] });
      B.push(...prepBlocks(dPlan));
    } else {
      B.push({ t: "h", text: "Buffer recipes" });
      B.push({ t: "table", title: "Final concentrations", head: ["Buffer ID", "Description", ...buf.comps.map((c) => `${c.name} (${c.unit})`)], rows: buf.conds.map((c) => [c.name, c.desc, ...buf.comps.map((k) => c.v?.[k.id] ?? "")]), fontSize: 7 });
      B.push({ t: "table", title: `Volumes to pipette for ${buf.vFinal} mL each`, head: ["Buffer ID", "Description", ...buf.comps.map((c) => c.name), "Water", "Final"], rows: bufRows.map(({ c, parts, water }) => [c.name, c.desc, ...parts.map((x) => (x > 0 ? fVol(x) : "–")), water < 0 ? "over volume" : fVol(water), fVol(vF)]), fontSize: 7 });
      B.push({ t: "p", text: "Salts already present in a component (for example NaCl in PBS) are not counted. Only what is added is listed." });
    }
    return B;
  };
  const makeNote = async () => {
    setNoteBusy(true); setNoteErr("");
    try {
      try { localStorage.setItem("labNoteWho", note.who); } catch {}
      const { buildLabNote } = await import("../lib/labnotepdf");
      const blocks = await noteBlocks();
      await buildLabNote({ blocks, meta: { ...note, title: note.title.trim() || `${TAB_T[tab]}` }, orientation: tab === "buf" ? "landscape" : "portrait", filename: `labnote_${note.date || "date"}_${tab}.pdf` });
    } catch (e) { console.error(e); setNoteErr("Could not make the PDF: " + (e?.message || e)); }
    setNoteBusy(false);
  };
  const reset = () => { setDil(DEF.dil); setBuf(DEF.buf); setBli(DEF.bli); setLay(DEF.lay); setSel(null); setPg(0); };

  return (
    <>
      <section className="pv-hero">
        <div className="container">
          <p className="eyebrow">Tools / 04 Assay and SAR</p>
          <div className="pv-titlerow">
            <h1 className="team-title"><span className="light">Plate</span> <span>planner</span></h1>
            <div className="pv-acts"><button className="pv-btn" onClick={() => setNoteOpen((o) => !o)} aria-expanded={noteOpen}>Lab note PDF</button><button className="pv-btn" onClick={reset}>Reset to example</button></div>
          </div>
          <p className="sq-lede">Plan dilution series, buffer recipes and 96-well BLI plates. For every solution you get the volumes to pipette, and for every well you get what goes in it. The numbers are examples to adjust, so check them against your own protocol before use.</p>
        </div>
      </section>

      <div className="container pv-wrap">
        <div className="pv">
          <div className="pv-row">
            {[["lay", "Layout designer"], ["bli", "BLI plate details"], ["dil", "Dilution series"], ["buf", "Buffer recipes"]].map(([k, t]) => <button key={k} className={`pv-chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{t}</button>)}
          </div>

          {noteOpen && (
            <section className="pv-card pp-note">
              <div className="pv-head"><p className="pv-lbl">Lab note PDF · {TAB_T[tab]} tab</p><button className="pv-chip" onClick={() => setNoteOpen(false)}>Close</button></div>
              <div className="pp-noterow">
                <Fld t="Date"><input className="pp-in" type="date" value={note.date} onChange={(e) => setNote({ ...note, date: e.target.value })} style={{ width: 150 }} /></Fld>
                <Fld t="Experimenter"><Txt v={note.who} set={(v) => setNote({ ...note, who: v })} w={170} ph="Your name" /></Fld>
                <Fld t="Title"><Txt v={note.title} set={(v) => setNote({ ...note, title: v })} w={260} ph={TAB_T[tab]} /></Fld>
              </div>
              <label className="pp-fld" style={{ alignItems: "flex-start" }}><span>Notes (optional)</span><textarea className="pp-in" style={{ width: "min(420px,100%)", height: 58, padding: 8 }} value={note.notes} placeholder="Purpose, sample lot, instrument, …" onChange={(e) => setNote({ ...note, notes: e.target.value })} /></label>
              <label className="pp-chk"><input type="checkbox" checked={note.sign} onChange={(e) => setNote({ ...note, sign: e.target.checked })} /> Add signature lines at the end</label>
              {noteErr && <p className="pv-err" role="alert">{noteErr}</p>}
              <div className="pv-row"><button className="pv-btn" onClick={makeNote} disabled={noteBusy}>{noteBusy ? "Making PDF…" : "Download PDF"}</button><span className="pv-small" style={{ margin: 0 }}>The PDF shows the current tab with the aLaDDIN and KRICT logos, the date and the experimenter.</span></div>
            </section>
          )}

          {tab === "lay" && (<>
            <div className="pv-main">
              <section className="pv-card pp-cfg">
                <p className="pv-lbl">Experiment</p>
                <Sel v={lay.mode} set={sL("mode")} opts={[["dose", "Concentration-dependent effect (cell or biochemical)"], ["bli", "BLI on an Octet"]]} />
                <p className="pv-small" style={{ margin: 0 }}>{lay.mode === "bli" ? "BLI plates run vertically. Each column is one step and each row (A to H) is one sensor, so a concentration series goes down a column." : "Each compound gets one series of concentrations. Choose whether a series runs along a row or down a column."}</p>
                <p className="pv-lbl">Compounds and concentrations</p>
                <Fld t="Number of compounds"><Num v={lay.nComp} set={sL("nComp")} w={70} min={1} /></Fld>
                <label className="pp-fld" style={{ alignItems: "flex-start" }}><span>Names (optional)</span><textarea className="pp-in" style={{ width: 190, height: 58, padding: 8 }} value={lay.names} placeholder="Cpd1, Cpd2, …" onChange={(e) => sL("names")(e.target.value)} /></label>
                <Fld t="Concentration points"><Num v={lay.points} set={sL("points")} w={70} min={2} /></Fld>
                <Fld t="Maximum"><Num v={lay.max} set={sL("max")} w={84} /><Sel v={lay.unit} set={sL("unit")} opts={CUNITS} w={72} /></Fld>
                <Fld t="Minimum"><Num v={lay.min} set={sL("min")} w={84} /><span className="pp-u">{lay.unit}</span></Fld>
                <Fld t="Series step"><Sel v={lay.snap} set={sL("snap")} opts={SNAPS} w={190} /></Fld>
                {lay.mode === "dose" ? (<>
                  <p className="pv-lbl">Plate</p>
                  <Fld t="Format"><Sel v={String(lay.plate)} set={(v) => sL("plate")(+v)} opts={[["96", "96-well (8 × 12)"], ["384", "384-well (16 × 24)"]]} w={170} /></Fld>
                  <Fld t="A series runs"><Sel v={lay.orient} set={sL("orient")} opts={[["row", "along a row (horizontal)"], ["col", "down a column (vertical)"]]} w={190} /></Fld>
                  <Fld t="Replicates"><Num v={lay.reps} set={sL("reps")} w={64} min={1} /></Fld>
                  <Fld t="Replicate placement"><Sel v={lay.repMode} set={sL("repMode")} opts={[["adjacent", "Next to each other"], ["blocks", "In separate blocks"]]} w={170} /></Fld>
                  <Fld t="Vehicle wells per series"><Num v={lay.veh} set={sL("veh")} w={64} min={0} /></Fld>
                  <Fld t="Positive wells per series"><Num v={lay.pos} set={sL("pos")} w={64} min={0} /></Fld>
                  <label className="pp-chk"><input type="checkbox" checked={lay.edge} onChange={(e) => sL("edge")(e.target.checked)} /> Leave the outer wells unused (edge effect)</label>
                  {lay.edge && <label className="pp-chk"><input type="checkbox" checked={lay.fillEdge} onChange={(e) => sL("fillEdge")(e.target.checked)} /> Fill the outer wells with PBS or medium</label>}
                </>) : (<>
                  <p className="pv-lbl">Sensors</p>
                  <Fld t="Sensor use"><Sel v={lay.sensors} set={sL("sensors")} opts={[["shared", "Shared: one baseline and loading, then each compound"], ["own", "Own sensors for each compound"], ["single", "Single-cycle: one sensor per compound, rising concentrations"]]} w={210} /></Fld>
                  <label className="pp-chk"><input type="checkbox" checked={lay.blank} onChange={(e) => sL("blank")(e.target.checked)} /> Blank row after the series</label>
                  <label className="pp-chk"><input type="checkbox" checked={lay.useRef} onChange={(e) => sL("useRef")(e.target.checked)} /> {lay.sensors === "single" ? "Reference sensors below the compounds (no protein loaded)" : "Reference sensor in row H"}</label>
                  {lay.sensors === "single" && lay.useRef && <Fld t="Number of reference sensors"><Num v={lay.nRef} set={sL("nRef")} w={64} min={1} /></Fld>}
                  <p className="pv-small" style={{ margin: 0 }}>Ligand, buffer, volumes and DMSO come from the BLI plate details tab.</p>
                </>)}
              </section>

              <section className="pv-card pp-out">
                <p className="pv-lbl">Concentration series</p>
                {ser.error ? <p className="pv-err" role="alert">{ser.error}</p> : (<>
                  <p style={{ margin: 0 }}>{ser.p} points, each <b>{sig(ser.f, 3)}-fold</b> lower than the one before, from {sig(+lay.max, 4)} down to {sig(ser.min, 4)} {lay.unit}.</p>
                  {ser.note && <p className="me-flag warn">{ser.note}</p>}
                  <div className="pp-chips">{ser.conc.map((c, k) => <span key={k}><i>{k + 1}</i>{sig(c, 4)} {lay.unit}</span>)}</div>
                </>)}
                {lay.mode === "dose" && dose && !dose.error && (
                  <p className="pv-small" style={{ margin: 0 }}>{dose.names.length} compound{dose.names.length > 1 ? "s" : ""} × {lay.reps} replicate{lay.reps > 1 ? "s" : ""} = {dose.linesNeeded} series. A {lay.plate}-well plate holds {dose.nLines} series of up to {dose.lineLen} wells here, so you need <b>{dose.nPlates} plate{dose.nPlates > 1 ? "s" : ""}</b>. Samples: {dose.linesNeeded * dose.series.p} wells, controls: {dose.linesNeeded * ((+lay.veh || 0) + (+lay.pos || 0))} wells.</p>
                )}
                {lay.mode === "bli" && bliPlates.length > 0 && <p className="pv-small" style={{ margin: 0 }}>{Math.round(lay.nComp)} compound{lay.nComp > 1 ? "s" : ""} need <b>{bliPlates.length} plate{bliPlates.length > 1 ? "s" : ""}</b> ({lay.sensors === "single" ? `up to ${bliPlates[0].plan.nRows ? 8 - (bliPlates[0].plan.nRows - bliPlates[0].cfg.analytes.length) : 8} compounds` : lay.sensors === "shared" ? "up to 4 compounds" : "up to 2 compounds"} per plate). Sensors (rows) used: {bliPlates[0].plan.nRows} of 8.</p>}
                <div className="pv-row"><button className="pv-chip" onClick={toDilution} disabled={!!ser.error}>Prepare these dilutions →</button>
                  {lay.mode === "bli" && bliPlates[pgi] && <button className="pv-chip" onClick={() => { setBli(bliPlates[pgi].cfg); setTab("bli"); }}>Open in BLI plate details →</button>}</div>
              </section>
            </div>

            {lay.mode === "dose" && dose?.error && <p className="pv-err" role="alert">{dose.error}</p>}
            {((lay.mode === "dose" && dose && !dose.error) || (lay.mode === "bli" && bliPlates.length > 0)) && (
              <section className="pv-card">
                <div className="pv-head"><div className="pv-row"><p className="pv-lbl">{lay.mode === "dose" ? `${lay.plate}-well plate` : "96-well plate"}{nPg > 1 ? ` · ${pgi + 1} of ${nPg}` : ""}</p>
                  {nPg > 1 && Array.from({ length: nPg }, (_, i) => <button key={i} className={`pv-chip ${i === pgi ? "on" : ""}`} onClick={() => { setPg(i); setSel(null); }}>Plate {i + 1}</button>)}</div>
                  <div className="pv-row"><ShapeToggle shape={shape} set={setShape} /><button className="pv-chip" onClick={() => exportPlate("svg")}>Plate SVG</button><button className="pv-chip" onClick={() => exportPlate("png")}>Plate PNG</button><button className="pv-chip" onClick={layCSV}>Well list CSV</button></div></div>
                <div className="pp-plate">
                  {lay.mode === "dose" ? <PlateView rows={dose.R} cols={dose.C} cells={dose.plates[pgi]} shape={shape} sel={sel} onSel={setSel} svgRef={svgR} />
                    : <PlateView rows={8} cols={12} cells={bliCells(bliPlates[pgi].plan)} heads={bliHeads(bliPlates[pgi].plan, bliPlates[pgi].cfg)} shape={shape} sel={sel} onSel={setSel} svgRef={svgR} />}
                </div>
                {lay.mode === "dose" && <div className="lx-legend">{dose.names.map((n, i) => <span key={i}><i style={{ background: PAL[i % PAL.length] }} />{n}</span>)}<span><i style={{ background: "#DADADA" }} />Vehicle</span><span><i style={{ background: "#F4B6B6" }} />Positive</span>{lay.edge && lay.fillEdge && <span><i style={{ background: "#EDEAE0" }} />Edge (PBS)</span>}</div>}
                <p className="pv-small">{sel ? <><b>{sel.well}</b> · {sel.full}</> : "Click a well to see what it holds. For samples, darker means a higher concentration."}</p>
              </section>
            )}
          </>)}

          {tab === "dil" && (
            <div className="pv-main">
              <section className="pv-card pp-cfg">
                <p className="pv-lbl">Compound and series</p>
                <Fld t="Stock (in 100% DMSO)"><Num v={dil.stock} set={sd("stock")} /><Sel v={dil.stockU} set={sd("stockU")} opts={CUNITS} w={72} /></Fld>
                <Fld t="Top concentration"><Num v={dil.top} set={sd("top")} /><Sel v={dil.topU} set={sd("topU")} opts={CUNITS} w={72} /></Fld>
                <Fld t="Dilution factor"><Num v={dil.factor} set={sd("factor")} w={70} min={1.01} /></Fld>
                <Fld t="Number of points"><Num v={dil.points} set={sd("points")} w={70} min={1} /></Fld>
                <Fld t="Final DMSO (%)"><Num v={dil.dmso} set={sd("dmso")} w={70} min={0} /></Fld>
                <Fld t="Volume needed per point (µL)"><Num v={dil.vUse} set={sd("vUse")} w={90} /></Fld>
                <label className="pp-chk"><input type="checkbox" checked={dil.blank} onChange={(e) => sd("blank")(e.target.checked)} /> Add a blank (0 conc., same DMSO)</label>
                <p className="pv-lbl">Method</p>
                <label className="pp-chk"><input type="radio" checked={dil.method === "buffer"} onChange={() => sd("method")("buffer")} /> Dilute in buffer that already contains the DMSO</label>
                <label className="pp-chk"><input type="radio" checked={dil.method === "dmso"} onChange={() => sd("method")("dmso")} /> Dilute in 100% DMSO, then spike into buffer</label>
                <p className="pv-small">The first method follows the usual SOP: a 100× intermediate is spiked into buffer and the series is made in buffer with matching DMSO. The second keeps the compound in DMSO until the last step, which helps with poor solubility. Set DMSO to 0 for water-soluble compounds.</p>
              </section>
              <section className="pv-card pp-out"><p className="pv-lbl">Preparation</p><PrepTable plan={dPlan} name="dilution" /></section>
            </div>
          )}

          {tab === "buf" && (
            <>
              <section className="pv-card">
                <div className="pv-head"><p className="pv-lbl">Recipe · final concentrations</p>
                  <div className="pv-row">
                    <Fld t="Final volume (mL)"><Num v={buf.vFinal} set={(v) => setBuf((b) => ({ ...b, vFinal: v }))} w={70} /></Fld>
                    <button className="pv-chip" onClick={() => setBuf((b) => ({ ...b, comps: [...b.comps, { id: uid(), name: "New component", unit: "%", stock: 10 }] }))}>Add component</button>
                    <button className="pv-chip" onClick={() => setBuf((b) => { const l = b.conds[b.conds.length - 1]; return { ...b, conds: [...b.conds, { id: uid(), name: `Cond ${b.conds.length + 1}`, desc: "", v: { ...(l?.v || {}) } }] }; })}>Add condition</button>
                  </div>
                </div>
                <div className="sq-scroll"><table className="sq-table pp-tbl"><thead>
                  <tr><th>Buffer ID</th><th>Description</th>{buf.comps.map((c) => <th key={c.id}><Txt v={c.name} set={(v) => setComp(c.id, "name", v)} w={110} /><div className="pp-st">stock <Num v={c.stock} set={(v) => setComp(c.id, "stock", v)} w={62} /><Sel v={c.unit} set={(v) => setComp(c.id, "unit", v)} opts={BUF_UNITS} w={64} /></div><button className="pp-x" onClick={() => setBuf((b) => ({ ...b, comps: b.comps.filter((x) => x.id !== c.id) }))} aria-label={`Remove ${c.name}`}>remove</button></th>)}<th /></tr></thead><tbody>
                  {buf.conds.map((c) => <tr key={c.id}><td><Txt v={c.name} set={(v) => setCond(c.id, "name", v)} w={90} /></td><td><Txt v={c.desc} set={(v) => setCond(c.id, "desc", v)} w={240} /></td>
                    {buf.comps.map((k) => <td key={k.id}><Num v={c.v?.[k.id] ?? ""} set={(v) => setVal(c.id, k.id, v)} w={74} /> <span className="pp-u">{k.unit}</span></td>)}
                    <td><button className="pp-x" onClick={() => setBuf((b) => ({ ...b, conds: b.conds.filter((x) => x.id !== c.id) }))}>remove</button></td></tr>)}
                </tbody></table></div>
                <p className="pv-small">Enter the final concentration of each component in the unit shown. Leave blank for none. Water makes up the rest.</p>
              </section>
              <section className="pv-card">
                <div className="pv-head"><p className="pv-lbl">Volumes to pipette for {buf.vFinal} mL each</p><button className="pv-chip" onClick={bufCSV}>Download CSV</button></div>
                <div className="sq-scroll"><table className="sq-table pp-tbl"><thead><tr><th>Buffer ID</th><th>Description</th>{buf.comps.map((c) => <th key={c.id}>{c.name}</th>)}<th>Water</th><th>Final</th></tr></thead><tbody>
                  {bufRows.map(({ c, parts, water }) => <tr key={c.id}><td><b>{c.name}</b></td><td>{c.desc}</td>{parts.map((p, i) => <td key={i}>{p > 0 ? fVol(p) : "–"}</td>)}<td className={water < 0 ? "pp-neg" : ""}>{water < 0 ? "over volume" : fVol(water)}</td><td><b>{fVol(vF)}</b></td></tr>)}
                  <tr className="pp-tot"><td colSpan={2}><b>Total of all conditions</b></td>{buf.comps.map((c, i) => <td key={c.id}>{fVol(bufRows.reduce((s, r) => s + r.parts[i], 0))}</td>)}<td>{fVol(bufRows.reduce((s, r) => s + Math.max(0, r.water), 0))}</td><td /></tr>
                </tbody></table></div>
                <p className="pv-small">Salts already present in a component (for example NaCl in PBS) are not counted. Enter only what you add.</p>
              </section>
            </>
          )}

          {tab === "bli" && (<>
            <div className="pv-main">
              <section className="pv-card pp-cfg">
                <p className="pv-lbl">Kinetics method</p>
                <Fld t="Method"><Sel v={bli.kin || "multi"} set={sb("kin")} opts={[["multi", "Multi-cycle"], ["single", "Single-cycle"]]} w={170} /></Fld>
                <p className="pv-small" style={{ margin: 0 }}>{single ? "Each row (A to H) is one compound on its own sensor. The sensor is dipped into the concentrations from low to high without regeneration, followed by one dissociation at the end." : "Each row is one concentration of one compound, and a concentration series goes down a column."}</p>
                <p className="pv-lbl">Plate</p>
                <Fld t="Volume per well (µL)"><Num v={bli.wellVol} set={sb("wellVol")} w={70} /></Fld>
                <Fld t="Extra per solution (µL)"><Num v={bli.extra} set={sb("extra")} w={70} /></Fld>
                <Fld t="Buffer DMSO (%)"><Num v={bli.dmso} set={sb("dmso")} w={70} min={0} /></Fld>
                <Fld t="First column"><Num v={bli.startCol} set={(v) => sb("startCol")(Math.max(1, Math.min(12, v || 1)))} w={70} /></Fld>
                <p className="pv-lbl">Ligand on the sensor</p>
                <Fld t="Name"><Txt v={bli.ligand.name} set={sl("name")} /></Fld>
                <Fld t="Loading conc."><Num v={bli.ligand.load} set={sl("load")} w={70} /><Sel v={bli.ligand.loadU} set={sl("loadU")} opts={["µg/mL", "nM", "µM"]} w={84} /></Fld>
                <Fld t="Ligand stock"><Num v={bli.ligand.stock} set={sl("stock")} w={84} /><span className="pp-u">{bli.ligand.loadU}</span></Fld>
                {!single && <label className="pp-chk"><input type="checkbox" checked={bli.useRef} onChange={(e) => sb("useRef")(e.target.checked)} /> Reference sensor in row H</label>}
                {(single || bli.useRef) && <Fld t={single ? "Reference sensor loading" : "Reference loading"}><Txt v={bli.refName} set={sb("refName")} w={110} ph={single ? "empty = no protein" : ""} /></Fld>}
                <p className="pv-lbl">{single ? `Concentration series (${Math.round(+bli.points) || 1} association columns, low to high)` : `Concentration series (rows A to ${letters[Math.max(0, Math.min(7, (+bli.points || 1) - 1))]})`}</p>
                <Fld t="Points"><Num v={bli.points} set={sb("points")} w={64} min={1} /></Fld>
                <Fld t="Factor"><Num v={bli.factor} set={sb("factor")} w={64} min={1.01} /></Fld>
                <label className="pp-chk"><input type="checkbox" checked={bli.blank} onChange={(e) => sb("blank")(e.target.checked)} /> {single ? "Blank sensor with ligand, buffer only" : "Blank row after the series"}</label>
                <Fld t="Dilution method"><Sel v={bli.method} set={sb("method")} opts={[["buffer", "In buffer with DMSO"], ["dmso", "In DMSO, then spike"]]} w={170} /></Fld>
                <p className="pv-lbl">{single ? "Compounds (one sensor each)" : "Analytes"}</p>
                {bli.analytes.map((a) => (
                  <div key={a.id} className="pp-an">
                    <Fld t="Name"><Txt v={a.name} set={(v) => setAn(a.id, "name", v)} w={96} /><button className="pp-x" onClick={() => setBli((b) => ({ ...b, analytes: b.analytes.filter((x) => x.id !== a.id), steps: b.steps.filter((s) => s.a !== a.id), refRows: (b.refRows || []).map((r) => (r.a === a.id ? { a: "" } : r)) }))}>remove</button></Fld>
                    <Fld t="Stock"><Num v={a.stock} set={(v) => setAn(a.id, "stock", v)} w={70} /><Sel v={a.stockU} set={(v) => setAn(a.id, "stockU", v)} opts={CUNITS} w={68} /></Fld>
                    <Fld t="Top conc."><Num v={a.top} set={(v) => setAn(a.id, "top", v)} w={70} /><Sel v={a.topU} set={(v) => setAn(a.id, "topU", v)} opts={CUNITS} w={68} /></Fld>
                  </div>
                ))}
                <button className="pv-chip" onClick={() => setBli((b) => ({ ...b, analytes: [...b.analytes, { id: uid(), name: `Cpd${b.analytes.length + 1}`, stock: 100, stockU: "mM", top: 25, topU: "µM" }] }))}>Add analyte</button>
              </section>

              <section className="pv-card pp-out">
                {single ? (<>
                  <div className="pv-head"><p className="pv-lbl">Columns, in the order the sensors move</p></div>
                  <div className="pp-chips">{bPlan.steps.map((st) => <span key={st.col}><i>{st.col + 1}</i>{st.t === "baseline" ? "Baseline" : st.t === "loading" ? "Loading" : st.t === "dissoc" ? "Dissociation" : st.hd}</span>)}</div>
                  <div className="pv-head"><p className="pv-lbl">Reference sensors (no protein loaded)</p>
                    <div className="pv-row"><button className="pv-chip" onClick={() => setBli((b) => ({ ...b, refRows: [...(b.refRows || []), { a: b.analytes[0]?.id || "" }] }))}>+ Add reference sensor</button></div></div>
                  {(bli.refRows || []).length === 0 && <p className="pv-small" style={{ margin: 0 }}>No reference sensor yet. Each one is added as a row below the compounds, and is dipped in the same concentrations as the compound you pick.</p>}
                  <div className="pp-steps">
                    {(bli.refRows || []).map((r, i) => (
                      <div key={i} className="pp-step"><b>{letters[bli.analytes.length + (bli.blank ? 1 : 0) + i] || "·"}</b>
                        <Sel v={r.a || ""} set={(v) => setBli((b) => ({ ...b, refRows: b.refRows.map((x, j) => (j === i ? { a: v } : x)) }))} opts={[...bli.analytes.map((a) => [a.id, `Same as ${a.name}`]), ["", "Buffer only"]]} w={190} />
                        <span className="pp-mv"><button onClick={() => setBli((b) => ({ ...b, refRows: b.refRows.filter((_, j) => j !== i) }))} aria-label="Remove reference sensor">✕</button></span>
                      </div>
                    ))}
                  </div>
                  <p className="pv-small" style={{ margin: 0 }}>Concentrations run from low to high across the association columns. In the dilution tables below, point 1 is the highest, so the last point goes into the first association column.</p>
                </>) : (<>
                <div className="pv-head"><p className="pv-lbl">Columns, in the order the sensors move</p>
                  <div className="pv-row"><span className="pv-small" style={{ margin: 0 }}>Presets</span>
                    <button className="pv-chip" onClick={() => sb("steps")(mkSteps("single", bli.analytes))}>One analyte</button>
                    <button className="pv-chip" onClick={() => sb("steps")(mkSteps("two", bli.analytes))}>Two analytes</button>
                    <button className="pv-chip" onClick={() => sb("steps")(mkSteps("regen", bli.analytes))}>With regeneration</button>
                  </div></div>
                <div className="pp-steps">
                  {bli.steps.map((s, i) => (
                    <div key={i} className="pp-step"><b>{(bli.startCol || 1) + i}</b>
                      <Sel v={s.t} set={(v) => setStep(i, "t", v)} opts={STEP_T} w={190} />
                      {s.t === "assoc" ? <Sel v={s.a || ""} set={(v) => setStep(i, "a", v)} opts={bli.analytes.map((a) => [a.id, a.name])} w={130} /> : (s.t === "regen" || s.t === "custom") ? <Txt v={s.label || ""} set={(v) => setStep(i, "label", v)} w={190} ph="Solution name" /> : <span className="pv-small" style={{ margin: 0 }}>{s.t === "loading" ? bli.ligand.name : bPlan.bufName}</span>}
                      <span className="pp-mv"><button onClick={() => moveStep(i, -1)} aria-label="Move left">↑</button><button onClick={() => moveStep(i, 1)} aria-label="Move right">↓</button><button onClick={() => setBli((b) => ({ ...b, steps: b.steps.filter((_, j) => j !== i) }))} aria-label="Remove column">✕</button></span>
                    </div>
                  ))}
                </div>
                <div className="pv-row">{STEP_T.map(([k, t]) => <button key={k} className="pv-chip" onClick={() => addStep(k)}>+ {t.split(" (")[0]}</button>)}</div>
                </>)}
                {bPlan.warnings.map((w, i) => <p key={i} className="me-flag warn">{w}</p>)}
              </section>
            </div>

            <section className="pv-card">
              <div className="pv-head"><p className="pv-lbl">96-well plate</p>
                <div className="pv-row"><ShapeToggle shape={shape} set={setShape} /><button className="pv-chip" onClick={() => exportPlate("svg")}>Plate SVG</button><button className="pv-chip" onClick={() => exportPlate("png")}>Plate PNG</button><button className="pv-chip" onClick={wellCSV}>Well list CSV</button></div></div>
              <div className="pp-plate"><PlateView rows={8} cols={12} cells={bliCells(bPlan)} heads={bliHeads(bPlan, bli)} shape={shape} sel={sel} onSel={setSel} svgRef={svgR} /></div>
              <p className="pv-small">{sel ? <><b>{sel.well}</b> · {sel.full} · {sel.vol} µL</> : "Click a well to see what goes in it. Each row is one sensor, and sensors move from column to column. Orange is the analyte, darker for higher concentration, and red marks the reference sensor (no protein)."}</p>
            </section>

            <section className="pv-card">
              <p className="pv-lbl">Solutions to prepare</p>
              <div className="sq-scroll"><table className="sq-table"><thead><tr><th>Solution</th><th>Total volume</th><th>How</th></tr></thead><tbody>
                {bPlan.sols.map((s, i) => <tr key={i}><td><b>{s.name}</b></td><td>{fVol(s.vol)}</td><td>{s.how}</td></tr>)}
              </tbody></table></div>
            </section>

            {bli.analytes.filter((a) => bPlan.plans[a.id]).map((a) => (
              <section key={a.id} className="pv-card"><p className="pv-lbl">{a.name} · concentration series</p><PrepTable plan={bPlan.plans[a.id]} name={a.name} /></section>
            ))}
          </>)}
          <p className="pv-small">Everything is calculated in your browser, and your settings are kept in this browser only. Volumes are plain arithmetic from the numbers entered, so check them against the plate type and protocol you use.</p>
        </div>
      </div>
    </>
  );
}
