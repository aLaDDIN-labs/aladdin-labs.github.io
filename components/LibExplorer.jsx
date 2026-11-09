"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRDKit } from "../lib/ligand2d";
import { parseSDFText, parseTable, similarityMatrix, butina, mdsLayout, pcaLayout, toCSV } from "../lib/libtools";
import { ACT_MODES, numericColumns, guessMode, guessColumn, activityArray, activityCliffs, analyzeCluster, drawHighlighted, drawPlain, pairCore } from "../lib/sartools";

const MAX = 3000;
const W0 = 760, H0 = 540;
const PROPS = [
  ["mw", "MW", 1], ["logp", "logP", 2], ["tpsa", "TPSA", 1], ["hbd", "HBD", 0], ["hba", "HBA", 0],
  ["rot", "Rot. bonds", 0], ["rings", "Rings", 0], ["fsp3", "Fsp3", 2],
];
const PAL = ["#F39800", "#6F6BD8", "#2E9E72", "#D9534F", "#3B8EDB", "#B07AC6", "#8A6D3B", "#E0709B", "#2AA3A3", "#9AA03A"];
const GREY = "#C9C6BC";
const EXAMPLE = `name,smiles
Thalidomide,O=C1CCC(N2C(=O)c3ccccc3C2=O)C(=O)N1
Lenalidomide,Nc1cccc2c1CN(C2=O)C1CCC(=O)NC1=O
Pomalidomide,Nc1cccc2c1C(=O)N(C2=O)C1CCC(=O)NC1=O
Aspirin,CC(=O)Oc1ccccc1C(=O)O
Ibuprofen,CC(C)Cc1ccc(cc1)C(C)C(=O)O
Naproxen,COc1ccc2cc(ccc2c1)C(C)C(=O)O
Diclofenac,OC(=O)Cc1ccccc1Nc1c(Cl)cccc1Cl
Paracetamol,CC(=O)Nc1ccc(O)cc1
Caffeine,Cn1cnc2c1c(=O)n(C)c(=O)n2C
Theophylline,Cn1c2nc[nH]c2c(=O)n(C)c1=O
Nicotine,CN1CCCC1c1cccnc1
Fluoxetine,CNCCC(Oc1ccc(cc1)C(F)(F)F)c1ccccc1
Sertraline,CNC1CCC(c2ccc(Cl)c(Cl)c2)c2ccccc12
Paroxetine,Fc1ccc(cc1)C1CCNCC1COc1ccc2OCOc2c1
Citalopram,CN(C)CCCC1(OCc2cc(C#N)ccc12)c1ccc(F)cc1
Diazepam,CN1C(=O)CN=C(c2ccccc2)c2cc(Cl)ccc12
Lorazepam,OC1N=C(c2ccccc2Cl)c2cc(Cl)ccc2NC1=O
Clonazepam,O=C1CN=C(c2ccccc2Cl)c2cc(ccc2N1)[N+]([O-])=O
Haloperidol,OC1(CCN(CCCC(=O)c2ccc(F)cc2)CC1)c1ccc(Cl)cc1
Risperidone,Cc1nc2CCCCn2c(=O)c1CCN1CCC(CC1)c1noc2cc(F)ccc12
Olanzapine,Cc1cc2C(=Nc3ccccc3Nc2s1)N1CCN(C)CC1
Clozapine,CN1CCN(CC1)C1=Nc2cc(Cl)ccc2Nc2ccccc12
Donepezil,COc1cc2CC(CC3CCN(Cc4ccccc4)CC3)C(=O)c2cc1OC
Memantine,CC12CC3CC(C)(C1)CC(N)(C3)C2
Rivastigmine,CCN(C)C(=O)Oc1cccc(c1)C(C)N(C)C
Levodopa,NC(Cc1ccc(O)c(O)c1)C(O)=O
Dopamine,NCCc1ccc(O)c(O)c1
Serotonin,NCCc1c[nH]c2ccc(O)cc12
Melatonin,COc1ccc2[nH]cc(CCNC(C)=O)c2c1
Sumatriptan,CNS(=O)(=O)Cc1ccc2[nH]cc(CCN(C)C)c2c1
Propranolol,CC(C)NCC(O)COc1cccc2ccccc12
Atenolol,CC(C)NCC(O)COc1ccc(CC(N)=O)cc1
Metoprolol,COCCc1ccc(OCC(O)CNC(C)C)cc1
Gabapentin,NCC1(CC(O)=O)CCCCC1
Pregabalin,CC(C)CC(CN)CC(O)=O
Carbamazepine,NC(=O)N1c2ccccc2C=Cc2ccccc12
Phenytoin,O=C1NC(=O)C(N1)(c1ccccc1)c1ccccc1
Valproic acid,CCCC(CCC)C(O)=O
Lamotrigine,Nc1nnc(c(N)n1)-c1cccc(Cl)c1Cl
Imatinib,Cc1ccc(NC(=O)c2ccc(CN3CCN(C)CC3)cc2)cc1Nc1nccc(n1)-c1cccnc1
Gefitinib,COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1
Erlotinib,COCCOc1cc2ncnc(Nc3cccc(c3)C#C)c2cc1OCCOC
Sildenafil,CCCc1nn(C)c2c1nc([nH]c2=O)-c1cc(ccc1OCC)S(=O)(=O)N1CCN(C)CC1
`;

const dl = (href, name) => { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
const blobUrl = (t, type) => URL.createObjectURL(new Blob([t], { type }));
const fmt = (v, d = 2) => (v == null || !Number.isFinite(v) ? "–" : Number(v).toFixed(d));
const ramp = (t) => { const a = [252, 232, 190], b = [150, 76, 0]; const c = a.map((x, i) => Math.round(x + (b[i] - x) * t)); return `rgb(${c})`; };

export default function LibExplorer() {
  const rdR = useRef(null);
  const simR = useRef(null);
  const svgR = useRef(null);
  const drag = useRef(null);
  const [mols, setMols] = useState([]);
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState("");
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [over, setOver] = useState(false);
  const [cut, setCut] = useState(0.55);
  const [layout, setLayout] = useState("struct");
  const [colorBy, setColorBy] = useState("cluster");
  const [sel, setSel] = useState(null);
  const [selSvg, setSelSvg] = useState("");
  const [thumbs, setThumbs] = useState([]);
  const [view, setView] = useState({ x: 0, y: 0, w: W0 });
  const [sortK, setSortK] = useState("cluster");
  const [sortD, setSortD] = useState(1);
  const [q, setQ] = useState("");
  const [onlyCl, setOnlyCl] = useState(false);
  const [showN, setShowN] = useState(100);
  const [actCol, setActCol] = useState("");
  const [actMode, setActMode] = useState("p");
  const [cliffSim, setCliffSim] = useState(0.55);
  const [cliffD, setCliffD] = useState(1);
  const [showCliffs, setShowCliffs] = useState(true);
  const [pair, setPair] = useState(null);
  const [pairSvg, setPairSvg] = useState(null);
  const [sar, setSar] = useState(null);
  const [sarBusy, setSarBusy] = useState(false);
  const [effSvg, setEffSvg] = useState({});
  const sarCache = useRef(new Map());

  const busy = !!status;
  const n = mols.length;
  const numCols = useMemo(() => numericColumns(mols), [mols]);
  useEffect(() => { const c = guessColumn(numCols); setActCol(c); if (c) setActMode(guessMode(c)); sarCache.current = new Map(); setPair(null); }, [numCols]);
  const act = useMemo(() => (actCol && n ? activityArray(mols, actCol, actMode) : null), [mols, actCol, actMode, n]);
  const nAct = act ? act.reduce((c, v) => c + (Number.isFinite(v) ? 1 : 0), 0) : 0;
  useEffect(() => { if (colorBy === "activity" && !nAct) setColorBy("cluster"); }, [nAct, colorBy]);

  const run = useCallback(async (records, label) => {
    setErr(""); setSel(null); setCoords(null); setMols([]); setView({ x: 0, y: 0, w: W0 });
    try {
      let list = records;
      if (list.length > MAX) { list = list.slice(0, MAX); setErr(`Only the first ${MAX} molecules were used.`); }
      setStatus("Loading RDKit…"); setProg(0);
      const rd = rdR.current || (rdR.current = await getRDKit());
      const out = [], fps = []; let bad = 0;
      const W = 64, det = JSON.stringify({ radius: 2, nBits: 2048 });
      setStatus("Computing properties…");
      for (let i = 0; i < list.length; i++) {
        const r = list[i]; let m = null;
        try { m = rd.get_mol(r.molblock || r.smiles); } catch { m = null; }
        if (!m || !m.is_valid()) { bad++; m?.delete(); }
        else {
          let smi = m.get_smiles();
          if (smi.includes(".")) { const big = smi.split(".").sort((a, b) => b.length - a.length)[0]; const m2 = rd.get_mol(big); if (m2 && m2.is_valid()) { m.delete(); m = m2; smi = m.get_smiles(); } else m2?.delete(); }
          const d = JSON.parse(m.get_descriptors());
          const u8 = new Uint8Array(m.get_morgan_fp_as_uint8array(det));
          fps.push(new Uint32Array(u8.buffer.slice(0, W * 4)));
          out.push({ name: r.name || `mol_${i + 1}`, smiles: smi, mw: d.amw, logp: d.CrippenClogP, tpsa: d.tpsa, hbd: d.NumHBD, hba: d.NumHBA, rot: d.NumRotatableBonds, heavy: d.NumHeavyAtoms, rings: d.NumRings, fsp3: d.FractionCSP3, extra: r.extra || {} });
          m.delete();
        }
        if (i % 40 === 39) { setProg(i / list.length); await new Promise((r) => setTimeout(r, 0)); }
      }
      setSkipped(bad);
      if (out.length < 3) throw new Error("Fewer than 3 molecules could be read from the file.");
      const N = out.length, flat = new Uint32Array(N * W); fps.forEach((f, i) => flat.set(f, i * W));
      setStatus("Comparing structures…"); setProg(0);
      const S = await similarityMatrix(flat, N, W, setProg);
      simR.current = S;
      setStatus("Laying out the map…"); setProg(0);
      const struct = await mdsLayout(S, N, setProg);
      const props = pcaLayout(out.map((o) => [o.mw, o.logp, o.tpsa, o.hbd, o.hba, o.rot, o.rings, o.fsp3]));
      setMols(out); setCoords({ struct, props }); setFileName(label); setShowN(100);
    } catch (e) { setErr(e.message || String(e)); }
    setStatus("");
  }, []);

  const readFiles = useCallback(async (files) => {
    const fl = [...files]; if (!fl.length) return;
    try {
      let recs = [];
      for (const f of fl) {
        const t = await f.text();
        if (/\.(sdf|sd|mol)$/i.test(f.name) || /M {2}END/.test(t.slice(0, 200000))) recs = recs.concat(parseSDFText(t));
        else recs = recs.concat(parseTable(t, f.name));
      }
      if (!recs.length) throw new Error("No molecules were found in the file.");
      await run(recs, fl.length === 1 ? fl[0].name : `${fl.length} files`);
    } catch (e) { setErr(e.message || String(e)); setStatus(""); }
  }, [run]);

  const clusters = useMemo(() => (n && simR.current ? butina(simR.current, n, cut) : null), [n, cut, mols]);
  const clOf = (i) => clusters?.cluster[i] ?? 0;
  const sizeOf = (i) => clusters?.groups[clOf(i)].length ?? 1;

  // normalised point positions
  const pts = useMemo(() => {
    if (!coords) return [];
    const c = coords[layout]; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    c.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    const pad = 28, s = Math.min((W0 - 2 * pad) / (x1 - x0 || 1), (H0 - 2 * pad) / (y1 - y0 || 1));
    const ox = (W0 - s * (x1 - x0)) / 2, oy = (H0 - s * (y1 - y0)) / 2;
    return c.map(([x, y]) => [ox + (x - x0) * s, oy + (y - y0) * s]);
  }, [coords, layout]);

  const range = useMemo(() => {
    if (colorBy === "cluster" || !n) return null;
    const v = colorBy === "activity" ? [...act].filter(Number.isFinite) : mols.map((m) => m[colorBy]);
    return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1];
  }, [colorBy, mols, n, act]);

  const colorOf = (i) => {
    if (colorBy === "cluster") { const c = clOf(i); return sizeOf(i) > 1 && c < PAL.length ? PAL[c] : GREY; }
    const [a, b] = range; const v = colorBy === "activity" ? act[i] : mols[i][colorBy];
    if (!Number.isFinite(v)) return GREY; return ramp(b > a ? (v - a) / (b - a) : 0.5);
  };

  // selected molecule drawing + cluster thumbnails
  useEffect(() => {
    let dead = false;
    (async () => {
      if (sel == null || !rdR.current || !mols[sel]) { setSelSvg(""); setThumbs([]); return; }
      const rd = rdR.current;
      const draw = (smi, w, h) => { const m = rd.get_mol(smi); if (!m || !m.is_valid()) { m?.delete(); return ""; } const s = m.get_svg(w, h); m.delete(); return s; };
      const coreS = sar && sar.cid === clOf(sel) ? sar.smarts : "";
      setSelSvg(coreS ? drawHighlighted(rd, mols[sel].smiles, 340, 250, coreS) : draw(mols[sel].smiles, 340, 250));
      const g = clusters?.groups[clOf(sel)] || [];
      setThumbs(g.slice(0, 12).map((i) => ({ i, svg: draw(mols[i].smiles, 120, 90) })));
      if (dead) return;
    })();
    return () => { dead = true; };
  }, [sel, mols, clusters, sar]);

  // core + R-group analysis for the selected cluster (lazy, cached)
  useEffect(() => {
    if (sel == null || !clusters || !rdR.current) { setSar(null); return; }
    const cid = clOf(sel), g = clusters.groups[cid];
    if (g.length < 3) { setSar({ cid, small: true }); return; }
    const key = `${cut}|${cid}|${g.length}|${actCol}|${actMode}`;
    const hit = sarCache.current.get(key); if (hit) { setSar(hit); return; }
    let dead = false; setSarBusy(true);
    const t = setTimeout(() => {
      let r; try { r = analyzeCluster(rdR.current, mols, g, act); } catch (e) { r = { smarts: "", note: "The analysis failed for this cluster." }; }
      r.cid = cid; sarCache.current.set(key, r);
      if (!dead) { setSar(r); setSarBusy(false); }
    }, 30);
    return () => { dead = true; clearTimeout(t); setSarBusy(false); };
  }, [sel, clusters, act, cut]);

  // depictions for the substituent table
  useEffect(() => {
    if (!sar?.effects || !rdR.current) { setEffSvg({}); return; }
    const o = {}; Object.values(sar.effects).flat().forEach((e) => { if (!(e.smi in o)) o[e.smi] = e.smi === "H" ? "" : drawPlain(rdR.current, e.smi, 100, 70); });
    if (sar.coreSmiles) o.__core = drawPlain(rdR.current, sar.coreSmiles, 240, 170);
    setEffSvg(o);
  }, [sar]);

  const cliffs = useMemo(() => (act && simR.current ? activityCliffs(simR.current, n, act, cliffSim, cliffD) : []), [act, n, cliffSim, cliffD, mols]);
  useEffect(() => {
    if (!pair || !rdR.current) { setPairSvg(null); return; }
    const a = mols[pair.i].smiles, b = mols[pair.j].smiles; const sm = pairCore(rdR.current, a, b);
    setPairSvg([drawHighlighted(rdR.current, a, 300, 220, sm), drawHighlighted(rdR.current, b, 300, 220, sm)]);
  }, [pair, mols]);

  const nCl = clusters?.groups.length || 0, nSingle = clusters ? clusters.groups.filter((g) => g.length === 1).length : 0;
  const legend = clusters ? clusters.groups.slice(0, PAL.length).map((g, k) => ({ k, size: g.length })).filter((x) => x.size > 1) : [];

  const rows = useMemo(() => {
    let r = mols.map((m, i) => ({ ...m, i, cluster: clOf(i) + 1, act: act ? act[i] : NaN }));
    if (q.trim()) { const t = q.trim().toLowerCase(); r = r.filter((x) => x.name.toLowerCase().includes(t) || x.smiles.toLowerCase().includes(t)); }
    if (onlyCl && sel != null) r = r.filter((x) => x.cluster === clOf(sel) + 1);
    r.sort((a, b) => { const x = a[sortK], y = b[sortK]; if (typeof x === "number" && Number.isNaN(x)) return 1; if (typeof y === "number" && Number.isNaN(y)) return -1; return (typeof x === "string" ? x.localeCompare(y) : x - y) * sortD; });
    return r;
  }, [mols, clusters, q, onlyCl, sel, sortK, sortD, act]);

  const sortBy = (k) => { if (k === sortK) setSortD(-sortD); else { setSortK(k); setSortD(1); } };

  // pan and zoom
  const zoom = (f) => setView((v) => { const nw = Math.min(W0, Math.max(W0 / 20, v.w * f)); const cx = v.x + v.w / 2, cy = v.y + (v.w * H0 / W0) / 2; return { w: nw, x: cx - nw / 2, y: cy - (nw * H0 / W0) / 2 }; });
  const onDown = (e) => { const di = e.target.getAttribute && e.target.getAttribute("data-i"); drag.current = { sx: e.clientX, sy: e.clientY, v: view, moved: false, i: di == null ? null : +di }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    const d = drag.current; if (!d) return;
    const rect = svgR.current.getBoundingClientRect(), k = d.v.w / rect.width;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy; if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setView({ ...d.v, x: d.v.x - dx * k, y: d.v.y - dy * k });
  };
  const onUp = () => { const d = drag.current; if (d && !d.moved && d.i != null) setSel(d.i); drag.current = null; };

  const exportTable = () => {
    const head = ["name", "smiles", "cluster", "cluster_size", ...(act ? ["activity_" + actMode] : []), ...PROPS.map((p) => p[0])];
    const body = mols.map((m, i) => [m.name, m.smiles, clOf(i) + 1, sizeOf(i), ...(act ? [Number.isFinite(act[i]) ? +act[i].toFixed(3) : ""] : []), ...PROPS.map((p) => (m[p[0]] == null ? "" : +Number(m[p[0]]).toFixed(3)))]);
    dl(blobUrl(toCSV([head, ...body]), "text/csv"), "library_clusters.csv");
  };
  const exportReps = () => {
    const body = clusters.groups.map((g, k) => { const c = g[0]; return [k + 1, g.length, mols[c].name, mols[c].smiles]; });
    dl(blobUrl(toCSV([["cluster", "size", "representative", "smiles"], ...body]), "cluster_representatives.csv"), "cluster_representatives.csv");
  };
  const mapSvgText = () => { const el = svgR.current.cloneNode(true); el.setAttribute("xmlns", "http://www.w3.org/2000/svg"); el.setAttribute("width", W0); el.setAttribute("height", H0); el.querySelectorAll("title").forEach((t) => t.remove()); return new XMLSerializer().serializeToString(el); };
  const exportMap = async (kind) => {
    if (kind === "svg") return dl(blobUrl(mapSvgText(), "image/svg+xml"), "library_map.svg");
    const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(mapSvgText());
    await new Promise((r) => { img.onload = r; });
    const c = document.createElement("canvas"); c.width = W0 * 3; c.height = H0 * 3; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    dl(c.toDataURL("image/png"), "library_map.png");
  };

  const m = sel != null ? mols[sel] : null;
  const Th = ({ k, children }) => <th onClick={() => sortBy(k)} style={{ cursor: "pointer" }}>{children}{sortK === k ? (sortD > 0 ? " ↑" : " ↓") : ""}</th>;

  return (
    <>
      <section className="pv-hero">
        <div className="container">
          <p className="eyebrow">Tools / 02 Screening</p>
          <div className="pv-titlerow">
            <h1 className="team-title"><span className="light">Library</span> <span>map</span></h1>
            <div className="pv-acts">
              <button className="pv-btn" onClick={exportReps} disabled={!clusters}>Cluster representatives</button>
              <button className="pv-btn pv-primary" onClick={exportTable} disabled={!n}>Download table (CSV)</button>
            </div>
          </div>
          <p className="sq-lede">Drop a compound library (CSV, SDF or SMILES file, up to {MAX.toLocaleString()} molecules). The tool computes properties, groups similar structures into clusters, and maps the library so you can click any point to see its structure.</p>
        </div>
      </section>

      <div className="container pv-wrap">
        <div className="pv">
          <label className={`lx-drop ${over ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); readFiles(e.dataTransfer.files); }}>
            <input type="file" multiple accept=".csv,.tsv,.txt,.smi,.smiles,.sdf,.sd,.mol" onChange={(e) => { readFiles(e.target.files); e.target.value = ""; }} hidden />
            <span className="lx-drop-t">{busy ? status : fileName ? `${fileName} · ${n.toLocaleString()} molecules` : "Drag a library file here, or click to choose"}</span>
            <span className="lx-drop-s">{busy ? `${Math.round(prog * 100)}%` : "CSV needs a SMILES column. SDF names come from the title line. Everything stays in your browser."}</span>
            {busy && <span className="lx-bar"><i style={{ width: `${Math.max(3, prog * 100)}%` }} /></span>}
          </label>
          <div className="pv-row" style={{ marginTop: -6 }}>
            <button className="pv-chip" disabled={busy} onClick={() => run(parseTable(EXAMPLE, "example"), "Example (CNS and kinase drugs)")}>Try an example</button>
            {err && <span className="pv-err" role="alert" style={{ margin: 0 }}>{err}</span>}
          </div>

          {n > 0 && clusters && (<>
            <p className="pv-small" style={{ margin: 0 }}>{n.toLocaleString()} molecules · {nCl - nSingle} clusters + {nSingle} singletons{skipped ? ` · ${skipped} could not be read` : ""}. Similarity is Tanimoto on Morgan fingerprints (radius 2, 2048 bits); salts are reduced to the largest fragment.</p>

            <div className="lx-jump">
              <span><b>SAR:</b> {numCols.length === 0 ? "no numeric activity column found. Add one (for example IC50_nM) to the CSV and reload." : act ? `using “${actCol}” (${nAct} of ${n} values).` : "choose an activity column above the map."}</span>
              <a href="#lx-sar">Core and substituents ↓</a>
              {numCols.length > 0 && <a href="#lx-cliffs">Activity cliffs ↓</a>}
            </div>

            <div className="pv-main">
              <section className="pv-card lx-map">
                <div className="pv-head">
                  <div className="pv-row">
                    {[["struct", "Structure similarity"], ["props", "Property space (PCA)"]].map(([k, t]) => <button key={k} className={`pv-chip ${layout === k ? "on" : ""}`} onClick={() => { setLayout(k); setView({ x: 0, y: 0, w: W0 }); }}>{t}</button>)}
                  </div>
                  <label className="lx-sel">Color by
                    <select value={colorBy} onChange={(e) => setColorBy(e.target.value)}><option value="cluster">Cluster</option>{nAct > 0 && <option value="activity">Activity</option>}{PROPS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
                  </label>
                </div>
                {numCols.length > 0 && (
                  <div className="pv-row lx-act">
                    <label className="lx-sel">Activity column
                      <select value={actCol} onChange={(e) => { setActCol(e.target.value); if (e.target.value) { setActMode(guessMode(e.target.value)); setColorBy("activity"); } }}><option value="">None</option>{numCols.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                    </label>
                    {actCol && <label className="lx-sel">Values are
                      <select value={actMode} onChange={(e) => setActMode(e.target.value)}>{ACT_MODES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
                    </label>}
                    {actCol && <span className="pv-small" style={{ margin: 0 }}>{nAct} of {n} values read</span>}
                  </div>
                )}
                <label className="lx-sel" style={{ alignSelf: "flex-start" }}>Cluster similarity cut-off <b>{cut.toFixed(2)}</b>
                  <input type="range" min="0.25" max="0.9" step="0.01" value={cut} onChange={(e) => setCut(+e.target.value)} />
                </label>
                <div className="lx-plot">
                  <svg ref={svgR} viewBox={`${view.x} ${view.y} ${view.w} ${view.w * H0 / W0}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} role="img" aria-label="Scatter map of the library; each point is a molecule">
                    <rect x="-5000" y="-5000" width="10000" height="10000" fill="#fff" />
                    {pts.map(([x, y], i) => i !== sel && <circle key={i} cx={x} cy={y} r={4 * view.w / W0 + 0.5} fill={colorOf(i)} fillOpacity=".85" stroke="#fff" strokeWidth={0.7 * view.w / W0} data-i={i} style={{ cursor: "pointer" }}><title>{mols[i].name}</title></circle>)}
                    {showCliffs && act && cliffs.map((c, k) => <line key={"l" + k} x1={pts[c.i][0]} y1={pts[c.i][1]} x2={pts[c.j][0]} y2={pts[c.j][1]} stroke="#D9534F" strokeOpacity=".7" strokeWidth={1.4 * view.w / W0} pointerEvents="none" />)}
                    {m && clusters.groups[clOf(sel)].length > 1 && clusters.groups[clOf(sel)].map((i) => i !== sel && <circle key={"c" + i} cx={pts[i][0]} cy={pts[i][1]} r={6 * view.w / W0 + 0.5} fill="none" stroke="#17181A" strokeWidth={1.2 * view.w / W0} pointerEvents="none" />)}
                    {m && <circle cx={pts[sel][0]} cy={pts[sel][1]} r={8 * view.w / W0 + 1} fill={colorOf(sel)} stroke="#17181A" strokeWidth={2.2 * view.w / W0} pointerEvents="none" />}
                  </svg>
                  <div className="lx-zoom"><button onClick={() => zoom(0.7)} aria-label="Zoom in">+</button><button onClick={() => zoom(1 / 0.7)} aria-label="Zoom out">−</button><button onClick={() => setView({ x: 0, y: 0, w: W0 })} aria-label="Reset view">⟲</button></div>
                </div>
                <div className="lx-legend">
                  {colorBy === "cluster" ? (<>{legend.map(({ k, size }) => <span key={k}><i style={{ background: PAL[k] }} />Cluster {k + 1} · {size}</span>)}<span><i style={{ background: GREY }} />Other</span></>)
                    : range && <span className="lx-grad"><b>{fmt(range[0], 1)}</b><i style={{ background: `linear-gradient(90deg,${ramp(0)},${ramp(1)})` }} /><b>{fmt(range[1], 1)}</b> {PROPS.find((p) => p[0] === colorBy)[1]}</span>}
                  <span className="lx-spacer" />
                  <button className="pv-chip" onClick={() => exportMap("svg")}>Map SVG</button>
                  <button className="pv-chip" onClick={() => exportMap("png")}>Map PNG</button>
                </div>
                <p className="pv-small">Drag to pan, use + and − to zoom. Points close together are structurally similar. Axes have no units.</p>
              </section>

              <aside className="pv-card lx-side">
                <p className="pv-lbl">Selected molecule</p>
                {m ? (<>
                  <div className="lx-struct" dangerouslySetInnerHTML={{ __html: selSvg }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>{m.name}</p>
                  <div className="me-smiles">{m.smiles}</div>
                  <div className="me-props">{PROPS.map(([k, t, d]) => <span key={k}>{t}<b>{fmt(m[k], d)}</b></span>)}</div>
                  <p className="pv-small">Cluster {clOf(sel) + 1} · {sizeOf(sel)} member{sizeOf(sel) > 1 ? "s" : ""}{act && Number.isFinite(act[sel]) ? ` · activity ${fmt(act[sel], 2)}` : ""}</p>
                  <div className="pv-row">
                    <button className="pv-chip" onClick={() => { try { navigator.clipboard.writeText(m.smiles); } catch {} }}>Copy SMILES</button>
                    <button className="pv-chip" onClick={() => { setOnlyCl(true); setShowN(100); }}>List this cluster</button>
                    <a className="pv-chip" href="#lx-sar" style={{ textDecoration: "none" }}>Core and SAR ↓</a>
                  </div>
                  {thumbs.length > 1 && (<>
                    <p className="pv-lbl">Cluster members{sizeOf(sel) > 12 ? ` (first 12 of ${sizeOf(sel)})` : ""}</p>
                    <div className="lx-thumbs">{thumbs.map((t) => <button key={t.i} className={t.i === sel ? "on" : ""} onClick={() => setSel(t.i)} title={mols[t.i].name} dangerouslySetInnerHTML={{ __html: t.svg }} />)}</div>
                  </>)}
                </>) : <p className="pv-small">Click a point on the map or a row in the table.</p>}
              </aside>
            </div>

            {m && (
              <section id="lx-sar" className="pv-card lx-sar">
                <div className="pv-head"><p className="pv-lbl">Core and substituents · cluster {clOf(sel) + 1}</p>{sarBusy && <span className="pv-small" style={{ margin: 0 }}>Analysing…</span>}</div>
                {sar?.small && <p className="pv-small">This cluster has fewer than 3 members. Raise or lower the similarity cut-off, or pick a larger cluster.</p>}
                {sar && !sar.small && !sar.smarts && <p className="pv-small">{sar.note || "No common core was found."}</p>}
                {sar && sar.smarts && (<>
                  <div className="lx-core">
                    <div className="lx-struct" dangerouslySetInnerHTML={{ __html: effSvg.__core || "" }} />
                    <p className="pv-small" style={{ margin: 0 }}>Common core of {sar.members.length} molecules ({sar.nCore} atoms). The numbered atoms mark the positions that vary (Position 1, 2, …). In the structure on the right, the core is blue-grey and the substituents are orange.{clusters.groups[clOf(sel)].length > 60 ? " Only the first 60 members were used." : ""}</p>
                  </div>
                  {sar.note && <p className="pv-small">{sar.note}</p>}
                  {act && Object.keys(sar.effects || {}).length > 0 ? Object.entries(sar.effects).map(([pos, list]) => (
                    <div key={pos} className="lx-eff">
                      <p className="pv-lbl">{pos.replace(/^R/, "Position ")} · mean {ACT_MODES.find((x) => x[0] === actMode)[0] === "raw" ? "value" : "pActivity"} per substituent (cluster mean {fmt(sar.meanAct, 2)})</p>
                      <div className="sq-scroll"><table className="sq-table"><thead><tr><th>Substituent</th><th /><th>n</th><th>Mean</th><th>Change vs cluster</th></tr></thead><tbody>
                        {list.map((e) => <tr key={e.smi}><td className="me-mono">{e.smi}</td><td className="lx-eff-s" dangerouslySetInnerHTML={{ __html: effSvg[e.smi] || (e.smi === "H" ? "H" : "") }} /><td>{e.n}</td><td>{fmt(e.mean, 2)}</td>
                          <td><span className="lx-diff"><i className={e.delta >= 0 ? "up" : "dn"} style={{ width: `${Math.min(100, Math.abs(e.delta) * 40)}px`, [e.delta >= 0 ? "marginLeft" : "marginRight"]: 0 }} /><b>{e.delta >= 0 ? "+" : ""}{fmt(e.delta, 2)}</b></span></td></tr>)}
                      </tbody></table></div>
                    </div>
                  )) : (act ? <p className="pv-small">Not enough variation or activity values in this cluster to compare substituents.</p> : <p className="pv-small">Add a numeric activity column to the CSV to see which substituents raise or lower activity.</p>)}
                </>)}
              </section>
            )}

            {!m && (
              <section id="lx-sar" className="pv-card lx-sar"><p className="pv-lbl">Core and substituents</p><p className="pv-small">Click a molecule on the map or in the table. The common core of its cluster and the effect of each substituent on activity appear here.</p></section>
            )}

            {act && (
              <section id="lx-cliffs" className="pv-card">
                <div className="pv-head"><p className="pv-lbl">Activity cliffs · {cliffs.length}{cliffs.length === 60 ? "+" : ""}</p>
                  <label className="lx-sel"><input type="checkbox" checked={showCliffs} onChange={(e) => setShowCliffs(e.target.checked)} /> Draw on map</label></div>
                <div className="pv-row">
                  <label className="lx-sel">Similarity ≥ <b>{cliffSim.toFixed(2)}</b><input type="range" min="0.3" max="0.95" step="0.01" value={cliffSim} onChange={(e) => setCliffSim(+e.target.value)} /></label>
                  <label className="lx-sel">Activity difference ≥ <b>{cliffD.toFixed(1)}</b><input type="range" min="0.3" max="3" step="0.1" value={cliffD} onChange={(e) => setCliffD(+e.target.value)} /></label>
                </div>
                <p className="pv-small">Pairs that look alike but differ strongly in activity. Each is the best place to ask which change mattered. Click a pair to see what differs (orange).</p>
                {pair && pairSvg && (
                  <div className="lx-pair">
                    {[pair.i, pair.j].map((id, k) => <figure key={id}><div className="lx-struct" dangerouslySetInnerHTML={{ __html: pairSvg[k] }} /><figcaption><b>{mols[id].name}</b> · {fmt(act[id], 2)}</figcaption></figure>)}
                  </div>
                )}
                {cliffs.length === 0 ? <p className="pv-small">No pairs at these thresholds.</p> : (
                  <div className="sq-scroll"><table className="sq-table lx-table"><thead><tr><th>Molecule A</th><th>Molecule B</th><th>Similarity</th><th>Δ activity</th></tr></thead><tbody>
                    {cliffs.map((c) => <tr key={c.i + "-" + c.j} className={pair && pair.i === c.i && pair.j === c.j ? "sel" : ""} onClick={() => { setPair(c); setSel(c.i); }}><td>{mols[c.i].name} ({fmt(act[c.i], 2)})</td><td>{mols[c.j].name} ({fmt(act[c.j], 2)})</td><td>{c.sim.toFixed(2)}</td><td>{c.delta.toFixed(2)}</td></tr>)}
                  </tbody></table></div>
                )}
              </section>
            )}

            <section className="pv-card">
              <div className="pv-head">
                <p className="pv-lbl">Table · {rows.length.toLocaleString()}</p>
                <div className="pv-row">
                  <input className="lx-search" placeholder="Search name or SMILES" value={q} onChange={(e) => { setQ(e.target.value); setShowN(100); }} />
                  {onlyCl && <button className="pv-chip on" onClick={() => setOnlyCl(false)}>Cluster only ✕</button>}
                </div>
              </div>
              <div className="sq-scroll"><table className="sq-table lx-table"><thead><tr><Th k="name">Name</Th><Th k="cluster">Cluster</Th>{act && <Th k="act">Activity</Th>}{PROPS.map(([k, t]) => <Th key={k} k={k}>{t}</Th>)}</tr></thead><tbody>
                {rows.slice(0, showN).map((r) => <tr key={r.i} className={r.i === sel ? "sel" : ""} onClick={() => setSel(r.i)}><td>{r.name}</td><td>{r.cluster}</td>{act && <td>{fmt(r.act, 2)}</td>}{PROPS.map(([k, , d]) => <td key={k}>{fmt(r[k], d)}</td>)}</tr>)}
              </tbody></table></div>
              {rows.length > showN && <button className="pv-chip" style={{ alignSelf: "flex-start" }} onClick={() => setShowN(showN + 200)}>Show more</button>}
            </section>
          </>)}
          <p className="pv-small">Properties and fingerprints come from RDKit-JS, running in your browser. Nothing in your library is uploaded. logP is the Crippen estimate. Clusters are Butina clusters, so changing the cut-off changes the grouping but not the map.</p>
        </div>
      </div>
    </>
  );
}
