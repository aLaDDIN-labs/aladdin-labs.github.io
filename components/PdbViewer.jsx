"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ligand2D, parsePDBQT, parseSDF, isLigandPDBQT, toPDBLines } from "../lib/ligand2d";
import { CHAIN_COLORS, chainColor, contactMapSVG, findContacts, findLigands, illustize, isHydrophobic } from "../lib/pdbtools";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const ELEM = { N: "#3050F8", O: "#E5372E", S: "#D4A017", P: "#E08A00", F: "#3CB371", CL: "#2E9E72", Cl: "#2E9E72", BR: "#8B4513" };
const BGS = { light: "radial-gradient(ellipse at 50% 42%,#fff 0%,#FAF6EB 70%,#F3EDDC 100%)", dark: "radial-gradient(ellipse at 50% 46%,#262A35 0%,#14151A 72%)", white: "#fff", clear: "" };
const BG_SOLID = { light: "#FAF6EB", dark: "#14151A", white: "#ffffff" };
const PRESETS = [["Single column 85 mm", 85, 60], ["Double column 180 mm", 180, 120], ["16:9 slide", 254, 143]];
const MAXPX = 4096;

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const download = (href, name) => { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
const toMM = (v, u) => (u === "in" ? v * 25.4 : u === "px" ? (v / 300) * 25.4 : v);

export default function PdbViewer() {
  const stage = useRef(null);
  const viewer = useRef(null);
  const $3D = useRef(null);
  const raw = useRef({ models: [] });
  const ligInfo = useRef(new Map());
  const ligNames = useRef(new Map());
  const atoms = useRef([]);
  const [input, setInput] = useState("1HSG");
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState(null);
  const [style, setStyle] = useState("cartoon");
  const [colorBy, setColorBy] = useState("chain");
  const [bg, setBg] = useState("light");
  const [illust, setIllust] = useState(false);
  const [ow, setOw] = useState(3);
  const [bands, setBands] = useState(5);
  const [ligands, setLigands] = useState([]);
  const [ligKey, setLigKey] = useState("");
  const [cutoff, setCutoff] = useState(4.5);
  const [showRes, setShowRes] = useState(true);
  const [showLab, setShowLab] = useState(true);
  const [chains, setChains] = useState([]);
  const [dlg, setDlg] = useState(false);
  const [tick, setTick] = useState(0);
  const [smilesMap, setSmilesMap] = useState({});
  const [smilesIn, setSmilesIn] = useState("");
  const [l2d, setL2d] = useState(null);
  const [l2dErr, setL2dErr] = useState("");

  const lig = useMemo(() => ligands.find((l) => l.key === ligKey), [ligands, ligKey]);
  const contacts = useMemo(() => (lig ? findContacts(atoms.current, lig, cutoff) : []), [lig, cutoff, tick]);
  const svg = useMemo(() => (lig ? contactMapSVG(lig, contacts, chains, `${lig.resn} ${lig.chain}${lig.resi} · ${info?.id || ""}`, l2d, atoms.current) : ""), [lig, contacts, chains, info, l2d]);

  const svgLig = useMemo(() => (lig ? contactMapSVG(lig, [], chains, `${lig.resn} ${lig.chain}${lig.resi}`, l2d, atoms.current, { ligandOnly: true }) : ""), [lig, chains, l2d]);
  const [dlgMode, setDlgMode] = useState("3d");
  const [copied, setCopied] = useState(false);
  const share = () => { try { navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} };

  // 2D structure of the chosen ligand (RDKit-JS, loaded on demand)
  useEffect(() => {
    setL2d(null); setL2dErr("");
    if (!lig) return;
    let dead = false;
    (async () => {
      try {
        let smi = smilesMap[lig.key];
        if (!smi && info?.source === "rcsb" && !ligInfo.current.has(lig.key)) {
          try {
            const d = await (await fetch(`https://data.rcsb.org/rest/v1/core/chemcomp/${lig.resn}`)).json();
            const ds = d.rcsb_chem_comp_descriptor || {};
            smi = ds.smiles || ds.SMILES || ds.smilesstereo || "";
          } catch {}
        }
        const r = await ligand2D(lig, ligInfo.current.get(lig.key), smi);
        if (!dead) setL2d(r);
      } catch (e) { if (!dead) setL2dErr(e.message || String(e)); }
    })();
    return () => { dead = true; };
  }, [lig, smilesMap]);

  // ---------- scene ----------
  const build = useCallback((v, T) => {
    const P = T;
    v.removeAllLabels(); v.removeAllSurfaces(); v.removeAllShapes(); v.setStyle({}, {});
    const bs = atoms.current.filter((a) => !a.hetflag).map((a) => a.b);
    const bmin = Math.min(...bs), bmax = Math.max(...bs);
    const col = (a) => {
      if (colorBy === "secondary") return a.ss === "h" ? "#E8803A" : a.ss === "s" ? "#F2C14E" : "#9AA1AD";
      if (colorBy === "bfactor") { const t = bmax > bmin ? (a.b - bmin) / (bmax - bmin) : 0; return t < 0.5 ? mix("#4C8FC9", "#F5F1E4", t * 2) : mix("#F5F1E4", "#E8803A", (t - 0.5) * 2); }
      if (colorBy === "hydrophobic") return isHydrophobic(a.resn) ? "#E8B040" : "#7FA9D8";
      return chainColor(chains, a.chain);
    };
    const prot = { hetflag: false };
    if (style === "cartoon") v.setStyle(prot, { cartoon: { colorfunc: col } });
    if (style === "sticks") v.setStyle(prot, { stick: { radius: 0.14, colorfunc: col } });
    if (style === "spheres") v.setStyle(prot, { sphere: { scale: 0.3, colorfunc: col } });
    if (style === "surface") { v.setStyle(prot, { cartoon: { colorfunc: col, opacity: 0.6 } }); v.addSurface(P.SurfaceType.VDW, { opacity: 0.85, colorfunc: col }, prot); }
    const ligStyle = (r) => ({ stick: { radius: r, colorfunc: (a) => (a.elem === "C" ? "#2E9E72" : ELEM[a.elem] || "#999") } });
    if (lig) {
      v.addStyle({ chain: lig.chain, resn: lig.resn, resi: lig.resi }, ligStyle(0.22));
      if (showRes) {
        for (const r of contacts) {
          v.addStyle({ chain: r.chain, resi: r.resi, hetflag: false }, { stick: { radius: 0.13, colorfunc: (a) => (a.elem === "C" ? chainColor(chains, a.chain) : ELEM[a.elem] || "#999") } });
          if (showLab) v.addLabel(`${r.resn}${r.resi}`, { position: { x: r.ca.x, y: r.ca.y, z: r.ca.z }, fontSize: 13, fontColor: "#222", backgroundColor: "#fff", backgroundOpacity: 0.88, borderColor: chainColor(chains, r.chain), borderThickness: 1.5, showBackground: true, inFront: true });
        }
      }
    } else for (const l of ligands) v.addStyle({ chain: l.chain, resn: l.resn, resi: l.resi }, ligStyle(0.16));
  }, [style, colorBy, chains, lig, contacts, showRes, showLab, ligands]);

  // create viewer once
  useEffect(() => {
    let dead = false;
    (async () => {
      const mod = await import("3dmol");
      const T = mod.createViewer ? mod : mod.default;
      if (dead || !stage.current) return;
      $3D.current = T;
      viewer.current = T.createViewer(stage.current, { backgroundAlpha: 0, antialias: true });
      const h = decodeURIComponent((location.hash || "").slice(1)).trim();
      load(h || "1HSG");
    })();
    return () => { dead = true; try { viewer.current?.clear(); } catch {} };
    // eslint-disable-next-line
  }, []);

  useEffect(() => { if (viewer.current && status === "ready") { build(viewer.current, $3D.current); viewer.current.render(); } }, [build, status]);

  async function ingest(models, meta, append = false) {
    const v = viewer.current;
    v.clear();
    const all = append ? [...raw.current.models, ...models] : models;
    for (const m of all) v.addModel(m.data, m.fmt);
    raw.current = { models: all };
    atoms.current = v.selectedAtoms({});
    const ch = [...new Set(atoms.current.filter((a) => !a.hetflag).map((a) => a.chain))];
    setChains(ch);
    const ls = findLigands(atoms.current);
    setLigands(ls); setLigKey(""); setInfo(meta); setTick((t) => t + 1);
    setStatus("ready");
    v.zoomTo(); v.render();
  }

  async function load(id) {
    const clean = id.trim().toUpperCase();
    setErr(""); setStatus("loading");
    try {
      if (!/^[0-9][A-Z0-9]{3}$/.test(clean)) throw new Error("Enter a four-character PDB ID such as 1HSG, or upload a file.");
      let data, fmt = "pdb";
      let r = await fetch(`https://files.rcsb.org/download/${clean}.pdb`);
      if (!r.ok) { r = await fetch(`https://files.rcsb.org/download/${clean}.cif`); fmt = "cif"; }
      if (!r.ok) throw new Error(`${clean} was not found at RCSB.`);
      data = await r.text();
      let meta = { id: clean, title: "", sub: "" };
      try {
        const e = await (await fetch(`https://data.rcsb.org/rest/v1/core/entry/${clean}`)).json();
        const res = e.rcsb_entry_info?.resolution_combined?.[0];
        meta = { id: clean, title: e.struct?.title || "", sub: `${(e.exptl?.[0]?.method || "").replace("X-RAY DIFFRACTION", "X-ray")}${res ? ` · ${res} Å` : ""}` };
      } catch {}
      setInput(clean);
      try { history.replaceState(null, "", `#${clean}`); } catch {}
      ligInfo.current = new Map(); ligNames.current = new Map(); setSmilesMap({});
      await ingest([{ data, fmt }], { ...meta, source: "rcsb" });
    } catch (e) { setErr(e.message || String(e)); setStatus(atoms.current.length ? "ready" : "idle"); }
  }

  async function onFiles(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    if (!files.length) return;
    try {
      setErr(""); setStatus("loading");
      const structs = [], ligs = [];
      for (const f of files) {
        const ext = f.name.split(".").pop().toLowerCase(); const text = await f.text();
        if (ext === "sdf" || ext === "mol") ligs.push({ f, info: parseSDF(text) });
        else if (ext === "pdbqt") { if (isLigandPDBQT(text)) ligs.push({ f, info: parsePDBQT(text) }); else structs.push({ f, data: text.split("\n").filter((l) => /^(ATOM|HETATM)/.test(l)).map((l) => l.slice(0, 66).padEnd(66) + "          " + (l.slice(77).trim() ? ({ A: "C", OA: "O", NA: "N", SA: "S" }[l.slice(77).trim()] || l.slice(77).trim()) : "C").padStart(2)).join("\n"), fmt: "pdb" }); }
        else if (["pdb", "ent", "cif", "mmcif"].includes(ext)) structs.push({ f, data: text, fmt: ext === "cif" || ext === "mmcif" ? "cif" : "pdb" });
        else throw new Error(`${f.name}: unsupported file type. Use .pdb, .cif, .mmcif for structures and .sdf, .mol, .pdbqt for ligands.`);
      }
      const append = !structs.length && atoms.current.length > 0;
      if (!append) { ligInfo.current = new Map(); ligNames.current = new Map(); setSmilesMap({}); }
      const models = structs.map((x) => ({ data: x.data, fmt: x.fmt }));
      const base = append ? findLigands(atoms.current).filter((l) => l.chain === "L").length : 0;
      let serial = 90000;
      ligs.forEach((l, k) => {
        const n = base + k + 1; const resn = n < 10 ? `LG${n}` : `L${n}`;
        models.push({ data: toPDBLines(l.info, resn, "L", n, serial), fmt: "pdb" }); serial += l.info.atoms.length;
        ligInfo.current.set(`L:${resn}:${n}`, l.info); ligNames.current.set(resn, l.f.name);
      });
      const first = structs[0]?.f || ligs[0].f;
      const meta = append ? { ...info } : { id: first.name.replace(/\.[^.]+$/, ""), title: files.map((f) => f.name).join(" + "), sub: "Uploaded files", source: "upload" };
      await ingest(models, meta, append);
    } catch (e2) { setErr(e2.message || String(e2)); setStatus(atoms.current.length ? "ready" : "idle"); }
  }

  function chooseLigand(k) {
    setLigKey(k);
    const v = viewer.current; if (!v) return;
    const l = ligands.find((x) => x.key === k);
    setTimeout(() => { if (l) v.zoomTo({ within: { distance: cutoff + 2, sel: { chain: l.chain, resn: l.resn, resi: l.resi } } }); else v.zoomTo(); v.render(); }, 30);
  }
  const focusRes = (r) => { const v = viewer.current; v.zoomTo({ chain: r.chain, resi: r.resi }); v.zoom(0.55, 500); v.render(); };

  return (
    <>
      <section className="pv-hero">
        <div className="container">
          <p className="eyebrow">Tools / 01 Structure</p>
          <div className="pv-titlerow">
            <h1 className="team-title"><span className="light">PDB</span> <span>viewer</span>{lig && <span className="light"> · ligand mode</span>}</h1>
            <div className="pv-acts">
              <button className="pv-btn" onClick={share}>{copied ? "Link copied" : "Copy share link"}</button>
              <button className="pv-btn pv-primary" onClick={() => { setDlgMode("3d"); setDlg(true); }} disabled={status !== "ready"}>Export figure…</button>
            </div>
          </div>
          <div className="pv-load">

        <label className="pv-id"><span className="sr">PDB ID</span>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(input)} spellCheck="false" aria-label="PDB ID" />
        </label>
        <button className="pv-btn pv-primary" onClick={() => load(input)} disabled={status === "loading"}>{status === "loading" ? "Loading…" : "Load"}</button>
        <label className="pv-btn">Upload files<input type="file" multiple accept=".pdb,.ent,.cif,.mmcif,.sdf,.mol,.pdbqt" onChange={onFiles} hidden /></label>
        {info && <div className="pv-info"><b>{info.id}</b>{info.sub ? ` · ${info.sub}` : ""}<span>{info.title}</span></div>}
        <p className="pv-small pv-grow">Structure: .pdb .cif .mmcif · Ligand or docking pose: .sdf .mol .pdbqt. Select a protein and a ligand file together, or add a ligand to a loaded structure.</p>
        {err && <p className="pv-err" role="alert">{err}</p>}
          </div>
        </div>
      </section>
      <div className="container pv-wrap"><div className="pv">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="pv-illust" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feComponentTransfer in="SourceGraphic" result="flat">
            {["R", "G", "B"].map((c) => {
              const T = { tableValues: Array.from({ length: bands }, (_, i) => (0.18 + (0.82 * i) / (bands - 1)).toFixed(2)).join(" "), type: "discrete" };
              return c === "R" ? <feFuncR key={c} {...T} /> : c === "G" ? <feFuncG key={c} {...T} /> : <feFuncB key={c} {...T} />;
            })}
          </feComponentTransfer>
          <feMorphology in="SourceAlpha" operator="dilate" radius={ow} result="grow" />
          <feFlood floodColor="#17181A" result="ink" />
          <feComposite in="ink" in2="grow" operator="in" result="outline" />
          <feMerge><feMergeNode in="outline" /><feMergeNode in="flat" /></feMerge>
        </filter>
      </svg>

      <div className="pv-main">
        <section className="pv-stagewrap">
          <div className="pv-bar">
            {["cartoon", "surface", "sticks", "spheres"].map((s) => <button key={s} className={`pv-chip${style === s ? " on" : ""}`} onClick={() => setStyle(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}
            <button className={`pv-chip pv-illust${illust ? " on" : ""}`} onClick={() => setIllust(!illust)} aria-pressed={illust}>✎ Illust</button>
            <button className="pv-chip pv-right" onClick={() => { viewer.current?.zoomTo(); viewer.current?.render(); }}>Reset view</button>
          </div>
          <div className={`pv-stage bg-${bg}`} style={{ background: BGS[bg] || undefined }}>
            <div ref={stage} className="pv-canvas" style={illust ? { filter: "url(#pv-illust)" } : undefined} />
            {status === "loading" && <div className="pv-wait">Loading structure…</div>}
            <span className="pv-hint">Drag to rotate · scroll to zoom · right-drag to move</span>
          </div>
        </section>

        <aside className="pv-card pv-side">
          <p className="pv-lbl">Color by</p>
          <div className="pv-row">{[["chain", "Chain"], ["secondary", "Secondary"], ["bfactor", "B-factor"], ["hydrophobic", "Hydrophobic"]].map(([k, t]) => <button key={k} className={`pv-chip${colorBy === k ? " on" : ""}`} onClick={() => setColorBy(k)}>{t}</button>)}</div>
          <p className="pv-lbl">Background</p>
          <div className="pv-row">{[["light", "Light"], ["dark", "Dark"], ["white", "White"], ["clear", "Transparent"]].map(([k, t]) => <button key={k} className={`pv-chip${bg === k ? " on" : ""}`} onClick={() => setBg(k)}>{t}</button>)}</div>
          <p className="pv-lbl">Ligand</p>
          <select value={ligKey} onChange={(e) => chooseLigand(e.target.value)} aria-label="Ligand" disabled={!ligands.length}>
            <option value="">{ligands.length ? "None (whole structure)" : "No ligand found"}</option>
            {ligands.map((l) => <option key={l.key} value={l.key}>{l.resn} · chain {l.chain} · {l.resi}{ligNames.current.get(l.resn) ? ` · ${ligNames.current.get(l.resn)}` : ""}</option>)}
          </select>
          {lig && (<>
            <label className="pv-chk"><input type="checkbox" checked={showRes} onChange={(e) => setShowRes(e.target.checked)} />Interacting residues (whole complex)</label>
            <label className="pv-chk"><input type="checkbox" checked={showLab} onChange={(e) => setShowLab(e.target.checked)} />Residue labels</label>
            {!ligInfo.current.get(lig.key)?.bondsKnown && (
              <div className="pv-smi">
                <label>SMILES (optional, improves the 2D drawing)<input value={smilesIn} onChange={(e) => setSmilesIn(e.target.value)} placeholder="CS(=O)(=O)Nc1ccc(Cl)cc1" spellCheck="false" /></label>
                <button className="pv-chip" onClick={() => setSmilesMap((m) => ({ ...m, [lig.key]: smilesIn.trim() }))}>Apply</button>
              </div>
            )}
            <label className="pv-rng">Contact cutoff <b>{cutoff.toFixed(1)} Å</b><input type="range" min="3" max="6" step="0.5" value={cutoff} onChange={(e) => setCutoff(+e.target.value)} /></label>
          </>)}
          {illust && (<>
            <p className="pv-lbl">Illust</p>
            <label className="pv-rng">Outline width <b>{ow}px</b><input type="range" min="1" max="8" value={ow} onChange={(e) => setOw(+e.target.value)} /></label>
            <label className="pv-rng">Shading bands <b>{bands}</b><input type="range" min="2" max="8" value={bands} onChange={(e) => setBands(+e.target.value)} /></label>
          </>)}
        </aside>
      </div>

      {lig && (
        <div className="pv-main pv-lower">
          <section className="pv-card pv-map">
            <div className="pv-head"><p className="pv-lbl">Contact map · {lig.resn} {lig.chain}{lig.resi}</p><span>{contacts.length} residues within {cutoff.toFixed(1)} Å</span><button className="pv-chip" onClick={() => { setDlgMode("2d"); setDlg(true); }}>Export map…</button></div>
            <div className="pv-svg" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="pv-note">{l2dErr ? `2D drawing failed (${l2dErr}); showing the 3D projection.` : l2d ? l2d.note : "Preparing the 2D drawing…"} Distances are in Å. Interaction types are assigned from distance and atom type only.</p>
          </section>
          <section className="pv-card pv-reslist">
            <p className="pv-lbl">Interacting residues · {contacts.length}</p>
            {chains.map((c) => { const rs = contacts.filter((r) => r.chain === c); return rs.length ? (
              <div key={c} className="pv-chains"><b>Chain {c}</b>
                {rs.map((r) => <button key={r.key} className="pv-res" style={{ borderColor: chainColor(chains, r.chain) }} onClick={() => focusRes(r)}>{r.resn}{r.resi}<small>{r.dist.toFixed(1)}</small></button>)}
              </div>) : null; })}
          </section>
        </div>
      )}
      {dlg && <ExportDialog initMode={dlgMode} svgLig={svgLig} onClose={() => setDlg(false)} viewer={viewer} T={$3D} raw={raw} build={build} illust={illust} ow={ow} bands={bands} bg={bg} lig={lig} svg={svg} info={info} />}
      </div></div>
    </>
  );
}

function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------------------
function ExportDialog({ initMode, svgLig, onClose, viewer, T, raw, build, illust, ow, bands, bg, lig, svg, info }) {
  const [mode, setMode] = useState(initMode === "2d" && lig ? "2d" : "3d");
  const [which, setWhich] = useState("map");
  const svgSel = which === "lig" ? svgLig : svg;
  const vb = (svgSel.match(/viewBox="0 0 (\d+) (\d+)"/) || [0, 0, 760, 860]).slice(1).map(Number);
  const [w, setW] = useState(180), [h, setH] = useState(120), [unit, setUnit] = useState("mm");
  const [dpi, setDpi] = useState(600);
  const [fmt, setFmt] = useState("pdf");
  const [transparent, setTransparent] = useState(true);
  const [mark, setMark] = useState(true);
  const [pos, setPos] = useState("center");
  const [msize, setMsize] = useState(8);
  const [useIllust, setUseIllust] = useState(illust);
  const [prev, setPrev] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const wmm = toMM(w, unit), hmm = toMM(h, unit);
  let px = [Math.round((wmm / 25.4) * dpi), Math.round((hmm / 25.4) * dpi)];
  const cap = Math.max(...px) > MAXPX;
  if (cap) { const k = MAXPX / Math.max(...px); px = px.map((x) => Math.round(x * k)); }
  const effDpi = Math.round((px[0] / wmm) * 25.4);

  const compose = useCallback(async (srcUri, W, H, scaleRef) => {
    const img = await loadImg(srcUri);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const k = Math.min(W / img.width, H / img.height);
    const layer = document.createElement("canvas"); layer.width = W; layer.height = H;
    layer.getContext("2d").drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k);
    const art = useIllust ? illustize(layer, { radius: Math.max(1, ow * (W / (scaleRef || W))), bands }) : layer;
    const x = c.getContext("2d");
    if (!transparent) { x.fillStyle = BG_SOLID[bg] || "#fff"; x.fillRect(0, 0, W, H); }
    x.drawImage(art, 0, 0);
    if (mark) {
      const logo = await loadImg(`${BASE}/images/brand/logo.png`);
      const lh = H * (msize / 100); const lw = (logo.width / logo.height) * lh; const m = H * 0.02;
      const lx = pos === "left" ? m : pos === "right" ? W - lw - m : (W - lw) / 2;
      x.globalAlpha = 0.85; x.drawImage(logo, lx, H - lh - m, lw, lh); x.globalAlpha = 1;
    }
    return c;
  }, [useIllust, ow, bands, transparent, bg, mark, pos, msize]);

  // preview
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const pw = 720, ph = Math.round((720 * hmm) / wmm);
        if (mode === "3d") { const c = await compose(viewer.current.pngURI(), pw, ph, 900); if (!dead) setPrev(c.toDataURL()); }
        else if (!dead) setPrev("");
      } catch {}
    })();
    return () => { dead = true; };
  }, [compose, mode, wmm, hmm, viewer]);

  async function run() {
    setBusy(true); setMsg("");
    try {
      const name = `${info?.id || "structure"}${lig ? "_" + lig.resn : ""}${mode === "2d" && which === "lig" ? "_structure" : ""}`;
      if (mode === "3d") {
        const [W, H] = px;
        let uri;
        const holder = document.createElement("div");
        holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${W}px;height:${H}px`;
        document.body.appendChild(holder);
        try {
          const v2 = T.current.createViewer(holder, { backgroundAlpha: 0, antialias: true });
          raw.current.models.forEach((m) => v2.addModel(m.data, m.fmt));
          build(v2, T.current);
          v2.setView(viewer.current.getView());
          v2.render();
          uri = v2.pngURI();
          v2.clear();
        } catch { uri = viewer.current.pngURI(); setMsg("High-resolution render was not available here, so the on-screen image was scaled instead."); }
        holder.remove();
        const c = await compose(uri, W, H, 900);
        const png = c.toDataURL("image/png");
        if (fmt === "png") download(png, `${name}.png`);
        else {
          const { jsPDF } = await import("jspdf");
          const doc = new jsPDF({ orientation: wmm >= hmm ? "l" : "p", unit: "mm", format: [wmm, hmm] });
          doc.addImage(png, "PNG", 0, 0, wmm, hmm, undefined, "FAST");
          doc.save(`${name}.pdf`);
        }
      } else {
        const out = svgSel;
        if (fmt === "svg") { download(URL.createObjectURL(new Blob([out], { type: "image/svg+xml" })), `${name}_contacts.svg`); }
        else if (fmt === "png") {
          const W = px[0], H0 = Math.round((W * vb[1]) / vb[0]), H = mark ? Math.round(H0 * (1 + msize / 100 + 0.05)) : H0;
          const img = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(out));
          const c = document.createElement("canvas"); c.width = W; c.height = H;
          const x = c.getContext("2d"); if (!transparent) { x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); } x.drawImage(img, 0, 0, W, H0);
          if (mark) { const lg = await loadImg(`${BASE}/images/brand/logo.png`); const lh = H * (msize / 100), lw = (lg.width / lg.height) * lh, m = H * 0.02; x.globalAlpha = 0.85; x.drawImage(lg, pos === "left" ? m : pos === "right" ? W - lw - m : (W - lw) / 2, H - lh - m, lw, lh); x.globalAlpha = 1; }
          download(c.toDataURL("image/png"), `${name}_contacts.png`);
        } else {
          const { jsPDF } = await import("jspdf");
          await import("svg2pdf.js");
          const holder = document.createElement("div"); holder.style.cssText = "position:fixed;left:-99999px;top:0"; holder.innerHTML = out; document.body.appendChild(holder);
          const el = holder.querySelector("svg");
          const doc = new jsPDF({ orientation: wmm >= hmm ? "l" : "p", unit: "mm", format: [wmm, hmm] });
          if (!transparent) { doc.setFillColor(255, 255, 255); doc.rect(0, 0, wmm, hmm, "F"); }
          const avail = hmm * (mark ? 1 - msize / 100 - 0.05 : 1); const k = Math.min(wmm / vb[0], avail / vb[1]); const mw = vb[0] * k, mh = vb[1] * k;
          await doc.svg(el, { x: (wmm - mw) / 2, y: (avail - mh) / 2, width: mw, height: mh });
          holder.remove();
          if (mark) {
            const logo = await loadImg(`${BASE}/images/brand/logo.png`);
            const lc = document.createElement("canvas"); lc.width = logo.width; lc.height = logo.height; lc.getContext("2d").drawImage(logo, 0, 0);
            const lh = hmm * (msize / 100), lw = (logo.width / logo.height) * lh, m = hmm * 0.02;
            doc.addImage(lc.toDataURL("image/png"), "PNG", pos === "left" ? m : pos === "right" ? wmm - lw - m : (wmm - lw) / 2, hmm - lh - m, lw, lh);
          }
          doc.save(`${name}_contacts.pdf`);
        }
      }
    } catch (e) { setMsg("Export failed: " + (e.message || e)); }
    setBusy(false);
  }

  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  useEffect(() => { if (mode === "2d" && fmt === "png" && false) setFmt("pdf"); }, [mode, fmt]);

  const formats = mode === "3d" ? [["pdf", "PDF"], ["png", "PNG"]] : [["pdf", "PDF (vector)"], ["svg", "SVG (vector)"], ["png", "PNG"]];
  return (
    <div className="pv-modal" role="dialog" aria-modal="true" aria-label="Export figure" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pv-dlg">
        <div className="pv-dhead"><h2><span>Export</span> figure</h2><button className="pv-x" onClick={onClose} aria-label="Close">×</button></div>
        <div className="pv-dbody">
          <div className="pv-dcol">
            <div className="pv-row">
              <button className={`pv-chip${mode === "3d" ? " on" : ""}`} onClick={() => { setMode("3d"); setFmt("pdf"); }}>Structure (3D)</button>
              <button className={`pv-chip${mode === "2d" ? " on" : ""}`} onClick={() => { setMode("2d"); setFmt("pdf"); }} disabled={!lig}>Contact map (2D){!lig ? " · pick a ligand" : ""}</button>
            </div>
            {mode === "2d" && (<>
              <p className="pv-lbl">Content</p>
              <div className="pv-row"><button className={`pv-chip${which === "map" ? " on" : ""}`} onClick={() => setWhich("map")}>Contact map</button><button className={`pv-chip${which === "lig" ? " on" : ""}`} onClick={() => setWhich("lig")}>Ligand structure only</button></div>
            </>)}
            <p className="pv-lbl">Size</p>
            <div className="pv-row">{PRESETS.map(([t, a, b]) => <button key={t} className={`pv-chip${unit === "mm" && w === a && h === b ? " on" : ""}`} onClick={() => { setUnit("mm"); setW(a); setH(b); }}>{t}</button>)}</div>
            <div className="pv-row pv-end">
              <label className="pv-fld">Width<input type="number" min="1" value={w} onChange={(e) => setW(+e.target.value || 1)} /></label>
              <label className="pv-fld">Height<input type="number" min="1" value={h} onChange={(e) => setH(+e.target.value || 1)} /></label>
              <label className="pv-fld pv-unit">Unit<select value={unit} onChange={(e) => setUnit(e.target.value)}><option>mm</option><option>in</option><option>px</option></select></label>
            </div>
            {!(mode === "2d" && fmt !== "png") && (<>
              <p className="pv-lbl">Resolution</p>
              <div className="pv-row pv-end">
                <label className="pv-fld pv-dpi">DPI<input type="number" min="72" value={dpi} onChange={(e) => setDpi(+e.target.value || 72)} /></label>
                {[300, 600, 1200].map((d) => <button key={d} className={`pv-chip${dpi === d ? " on" : ""}`} onClick={() => setDpi(d)}>{d}</button>)}
              </div>
              <p className="pv-small">Image size: <b>{px[0]} × {px[1]} px</b>{cap && <> · capped at {MAXPX} px, effective {effDpi} dpi</>}</p>
            </>)}
            <p className="pv-lbl">Format</p>
            <div className="pv-row">{formats.map(([k, t]) => <button key={k} className={`pv-chip${fmt === k ? " on" : ""}`} onClick={() => setFmt(k)}>{t}</button>)}</div>
            <label className="pv-chk"><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />Transparent background</label>
            {mode === "3d" && <label className="pv-chk"><input type="checkbox" checked={useIllust} onChange={(e) => setUseIllust(e.target.checked)} />Illust outline</label>}
            <p className="pv-lbl">Watermark</p>
            <label className="pv-chk"><input type="checkbox" checked={mark} onChange={(e) => setMark(e.target.checked)} />aLaDDIN logo at the bottom</label>
            <div className="pv-row">
              {["left", "center", "right"].map((p) => <button key={p} className={`pv-chip${pos === p ? " on" : ""}`} onClick={() => setPos(p)}>{p[0].toUpperCase() + p.slice(1)}</button>)}
              <label className="pv-rng pv-inline">Size<input type="range" min="4" max="16" value={msize} onChange={(e) => setMsize(+e.target.value)} /></label>
            </div>
          </div>
          <div className="pv-dcol">
            <p className="pv-lbl">Preview · {Math.round(wmm)} × {Math.round(hmm)} mm</p>
            <div className="pv-prev" style={{ aspectRatio: `${wmm}/${hmm}` }}>
              {mode === "3d" ? (prev && <img src={prev} alt="Export preview" />) : <div className="pv-prev2" dangerouslySetInnerHTML={{ __html: svgSel }} />}
            </div>
            <p className="pv-small">{mode === "3d" ? "The 3D structure is a rendered image placed in the file at the DPI above; the file is a PDF page of the chosen size. Outline is applied on the image." : "The contact map is written as vector shapes and text, so it stays sharp at any size."}</p>
            {msg && <p className="pv-err">{msg}</p>}
          </div>
        </div>
        <div className="pv-dfoot"><button className="pv-btn" onClick={onClose}>Cancel</button><button className="pv-btn pv-primary" onClick={run} disabled={busy}>{busy ? "Working…" : `Download ${fmt.toUpperCase()}`}</button></div>
      </div>
    </div>
  );
}
