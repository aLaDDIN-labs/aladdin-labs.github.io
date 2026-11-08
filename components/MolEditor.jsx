"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRDKit } from "../lib/ligand2d";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const EXAMPLES = [
  ["Thalidomide", "O=C1CCC(N2C(=O)c3ccccc3C2=O)C(=O)N1"],
  ["Lenalidomide", "Nc1cccc2c1CN(C2=O)C1CCC(=O)NC1=O"],
  ["Pomalidomide", "Nc1cccc2c1C(=O)N(C2=O)C1CCC(=O)NC1=O"],
  ["Aspirin", "CC(=O)Oc1ccccc1C(=O)O"],
  ["Caffeine", "Cn1cnc2c1c(=O)n(C)c(=O)n2C"],
];
const dl = (href, name) => { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
const blobUrl = (text, type) => URL.createObjectURL(new Blob([text], { type }));
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

export default function MolEditor() {
  const host = useRef(null);
  const ocl = useRef(null);
  const editor = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [smiles, setSmiles] = useState("");
  const [canon, setCanon] = useState("");
  const [formula, setFormula] = useState("");
  const [props, setProps] = useState(null);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [list, setList] = useState([]);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("molEditorList") || "[]"); if (Array.isArray(s)) setList(s); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("molEditorList", JSON.stringify(list)); } catch {} }, [list]);

  const refresh = useCallback(async () => {
    const e = editor.current, O = ocl.current; if (!e) return;
    const m = e.getMolecule();
    if (!m || m.getAllAtoms() === 0) { setSmiles(""); setCanon(""); setFormula(""); setProps(null); return; }
    const smi = m.toSmiles();
    setSmiles(smi);
    try { setFormula(m.getMolecularFormula().formula); } catch {}
    try {
      const rd = await getRDKit();
      const rm = rd.get_mol(smi);
      if (rm && rm.is_valid()) {
        const d = JSON.parse(rm.get_descriptors());
        setCanon(rm.get_smiles());
        setProps({ mw: d.amw, logp: d.CrippenClogP ?? d.CrippenLogP, tpsa: d.tpsa ?? d.TPSA, hbd: d.NumHBD ?? d.lipinskiHBD, hba: d.NumHBA ?? d.lipinskiHBA, rot: d.NumRotatableBonds, heavy: d.NumHeavyAtoms, rings: d.NumRings, arom: d.NumAromaticRings, fsp3: d.FractionCSP3 });
        rm.delete();
      }
    } catch { /* properties are optional */ }
  }, []);

  useEffect(() => {
    let dead = false, e;
    (async () => {
      try {
        const O = await import("openchemlib");
        if (dead || !host.current) return;
        ocl.current = O;
        e = new O.CanvasEditor(host.current);
        editor.current = e;
        e.setOnChangeListener(() => refresh());
        setReady(true);
      } catch (x) { setErr("The editor could not be loaded: " + (x.message || x)); }
    })();
    return () => { dead = true; try { e?.destroy(); } catch {} };
  }, [refresh]);

  const load = (text) => {
    const O = ocl.current, e = editor.current; if (!O || !e) return;
    const t = text.trim(); if (!t) return;
    try {
      const m = /M\s+END|V2000|V3000/.test(t) ? O.Molecule.fromMolfile(t) : O.Molecule.fromSmiles(t);
      e.setMolecule(m); setErr(""); refresh();
    } catch (x) { setErr("That text could not be read as a SMILES or molfile."); }
  };

  const copy = (text, key) => { try { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch {} };
  const base = () => (name.trim() || "molecule").replace(/[^\w.-]+/g, "_");
  const molfile = () => editor.current.getMolecule().toMolfile();
  const svgText = (w = 600, h = 450) => editor.current.getMolecule().toSVG(w, h, "mol", { noStereoProblem: true });

  const add = () => { if (!smiles) return; setList((l) => [...l, { id: Date.now(), name: name.trim() || `Compound ${l.length + 1}`, smiles: canon || smiles, mw: props?.mw ?? null }]); setName(""); };
  const sdf = () => list.map((x) => { const m = ocl.current.Molecule.fromSmiles(x.smiles); return `${x.name}\n${m.toMolfile().split("\n").slice(1).join("\n")}\n> <SMILES>\n${x.smiles}\n\n$$$$\n`; }).join("");

  async function exportAs(kind) {
    setBusy(kind);
    try {
      const n = base();
      if (kind === "smi") dl(blobUrl(`${canon || smiles}\t${name.trim() || n}\n`, "text/plain"), `${n}.smi`);
      else if (kind === "mol") dl(blobUrl(molfile(), "chemical/x-mdl-molfile"), `${n}.mol`);
      else if (kind === "svg") dl(blobUrl(svgText(), "image/svg+xml"), `${n}.svg`);
      else if (kind === "png") {
        const s = 6, W = 600 * s, H = 450 * s;
        const img = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText(600, 450)));
        const c = document.createElement("canvas"); c.width = W; c.height = H; c.getContext("2d").drawImage(img, 0, 0, W, H);
        dl(c.toDataURL("image/png"), `${n}.png`);
      } else if (kind === "pdf") {
        const { jsPDF } = await import("jspdf"); await import("svg2pdf.js");
        const holder = document.createElement("div"); holder.style.cssText = "position:fixed;left:-99999px;top:0"; holder.innerHTML = svgText(600, 450); document.body.appendChild(holder);
        const el = holder.querySelector("svg"); el.setAttribute("width", 600); el.setAttribute("height", 450);
        const doc = new jsPDF({ orientation: "l", unit: "mm", format: [120, 90] });
        await doc.svg(el, { x: 0, y: 0, width: 120, height: 90 }); holder.remove();
        doc.save(`${n}.pdf`);
      }
    } catch (x) { setErr("Export failed: " + (x.message || x)); }
    setBusy("");
  }

  const lip = useMemo(() => {
    if (!props) return null;
    const v = [props.mw > 500 && "MW > 500", props.logp > 5 && "logP > 5", props.hbd > 5 && "HBD > 5", props.hba > 10 && "HBA > 10"].filter(Boolean);
    return v;
  }, [props]);
  const veber = props && props.tpsa <= 140 && props.rot <= 10;
  const f = (v, d = 2) => (v == null || !Number.isFinite(v) ? "–" : Number(v).toFixed(d));

  return (
    <>
      <section className="pv-hero">
        <div className="container">
          <p className="eyebrow">Tools / 02 Screening</p>
          <div className="pv-titlerow">
            <h1 className="team-title"><span className="light">Mol</span> <span>editor</span></h1>
            <div className="pv-acts">
              <button className="pv-btn" onClick={() => copy(canon || smiles, "smi")} disabled={!smiles}>{copied === "smi" ? "Copied" : "Copy SMILES"}</button>
              <button className="pv-btn pv-primary" onClick={add} disabled={!smiles}>Add to list</button>
            </div>
          </div>
          <p className="sq-lede">Draw a molecule, or paste a SMILES or molfile. The SMILES and basic properties update as you draw, and you can collect several molecules into a list for the screening tools.</p>
        </div>
      </section>

      <div className="container pv-wrap">
        <div className="pv">
          <div className="pv-main">
            <section className="pv-stagewrap me-edit">
              <div ref={host} className="me-host" aria-label="Molecule drawing area" />
              {!ready && !err && <p className="pv-small">Loading the editor…</p>}
              {err && <p className="pv-err" role="alert">{err}</p>}
            </section>

            <aside className="pv-card me-side">
              <p className="pv-lbl">Load</p>
              <div className="pv-smi">
                <label>SMILES or molfile<input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(input)} placeholder="CC(=O)Oc1ccccc1C(=O)O" spellCheck="false" /></label>
                <button className="pv-chip" onClick={() => load(input)} disabled={!ready}>Load</button>
              </div>
              <div className="pv-row">{EXAMPLES.map(([n, s]) => <button key={n} className="pv-chip" onClick={() => { setName(n); setInput(s); load(s); }} disabled={!ready}>{n}</button>)}</div>

              <p className="pv-lbl">SMILES</p>
              <div className="me-smiles">{canon || smiles || <span>Draw a molecule to see its SMILES.</span>}</div>
              <label className="pv-fld">Name (used for files and the list)<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Compound 1" /></label>

              <p className="pv-lbl">Properties</p>
              {props ? (<>
                <div className="me-props">
                  <span>Formula<b>{formula || "–"}</b></span><span>MW<b>{f(props.mw)}</b></span>
                  <span>logP<b>{f(props.logp)}</b></span><span>TPSA<b>{f(props.tpsa, 1)}</b></span>
                  <span>HBD<b>{props.hbd ?? "–"}</b></span><span>HBA<b>{props.hba ?? "–"}</b></span>
                  <span>Rot. bonds<b>{props.rot ?? "–"}</b></span><span>Heavy atoms<b>{props.heavy ?? "–"}</b></span>
                  <span>Rings<b>{props.rings ?? "–"}</b></span><span>Fsp3<b>{f(props.fsp3)}</b></span>
                </div>
                <p className={`me-flag ${lip.length ? "warn" : "ok"}`}>{lip.length ? `Lipinski: ${lip.join(", ")}` : "Passes Lipinski rule of five"} · {veber ? "Passes Veber (TPSA ≤ 140, rotatable ≤ 10)" : "Outside Veber limits"}</p>
              </>) : <p className="pv-small">Shown once there is a molecule.</p>}

              <p className="pv-lbl">Export this molecule</p>
              <div className="pv-row">{[["smi", ".smi"], ["mol", "Molfile"], ["svg", "SVG"], ["png", "PNG"], ["pdf", "PDF"]].map(([k, t]) => <button key={k} className="pv-chip" onClick={() => exportAs(k)} disabled={!smiles || !!busy}>{busy === k ? "…" : t}</button>)}</div>
              <p className="pv-small">SVG and PDF are vector. PNG is transparent at 3600 × 2700 px.</p>
            </aside>
          </div>

          <section className="pv-card">
            <div className="pv-head"><p className="pv-lbl">List · {list.length}</p>
              <div className="pv-row">
                <button className="pv-chip" onClick={() => dl(blobUrl("smiles,name\n" + list.map((x) => `${x.smiles},${x.name}`).join("\n") + "\n", "text/csv"), "molecules.csv")} disabled={!list.length}>CSV</button>
                <button className="pv-chip" onClick={() => dl(blobUrl(list.map((x) => `${x.smiles}\t${x.name}`).join("\n") + "\n", "text/plain"), "molecules.smi")} disabled={!list.length}>.smi</button>
                <button className="pv-chip" onClick={() => dl(blobUrl(sdf(), "chemical/x-mdl-sdfile"), "molecules.sdf")} disabled={!list.length}>SDF</button>
                <button className="pv-chip" onClick={() => setList([])} disabled={!list.length}>Clear</button>
              </div>
            </div>
            {list.length === 0 ? <p className="pv-small">Molecules you add appear here. The list stays in this browser only.</p> : (
              <div className="sq-scroll"><table className="sq-table"><thead><tr><th>Name</th><th>SMILES</th><th>MW</th><th /></tr></thead><tbody>
                {list.map((x) => <tr key={x.id}><td>{x.name}</td><td className="me-mono">{x.smiles}</td><td>{f(x.mw, 1)}</td><td><button className="pv-chip" onClick={() => { setInput(x.smiles); setName(x.name); load(x.smiles); }}>Open</button> <button className="pv-chip" onClick={() => setList((l) => l.filter((y) => y.id !== x.id))}>Remove</button></td></tr>)}
              </tbody></table></div>
            )}
          </section>
          <p className="pv-small">Drawing uses OpenChemLib and properties use RDKit, both running in your browser. Nothing you draw is sent to a server.</p>
        </div>
      </div>
    </>
  );
}
