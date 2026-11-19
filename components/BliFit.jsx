"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyze, figureSvg, kdRows, KD_HEAD, loadExperiment, toCsv } from "../lib/blitools";
const Hd = ({ h }) => { const m = /^(.*?)(\s*\(.*\))$/.exec(h); return m ? <>{m[1]}<span className="bli-u">{m[2]}</span></> : h; };

const dl = (href, name) => { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
const blobUrl = (t, type) => URL.createObjectURL(new Blob([t], { type }));
const Num = ({ v, set, w = 84, min, max }) => <input className="pp-in" type="number" step="any" min={min} max={max} value={v ?? ""} style={{ width: w }} onChange={(e) => set(e.target.value === "" ? "" : +e.target.value)} />;
const Fld = ({ t, children }) => <label className="pp-fld"><span>{t}</span><span className="pp-ctl">{children}</span></label>;
const fmtC = (c) => (c == null ? "?" : c < 1 ? `${+(c * 1000).toPrecision(3)} nM` : `${+c.toPrecision(3)} µM`);

export default function BliFit() {
  const [exp, setExp] = useState(null);       // { info, raw }
  const [rows, setRows] = useState([]);       // per-sensor settings
  const [mode, setMode] = useState("single");
  const [opt, setOpt] = useState({ nPoints: 5, refSubtract: true, bulk: true, normalize: false });
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  const [fig, setFig] = useState({ wmm: 180, hmm: "", pt: 7, panels: "both", title: false, fmt: "pdf" });
  const [figBusy, setFigBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState({ date: new Date().toLocaleDateString("sv-SE"), who: "", title: "", notes: "", sign: true });
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteErr, setNoteErr] = useState("");
  useEffect(() => { try { const w = localStorage.getItem("labNoteWho"); if (w) setNote((n) => ({ ...n, who: w })); } catch {} }, []);

  const readFiles = async (list) => {
    const files = [...list].filter((f) => /\.frd$/i.test(f.name));
    if (!files.length) { setErr("Select the .frd files (one per sensor)."); return; }
    setErr(""); setOut(null);
    try {
      const data = await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
      const e = loadExperiment(data);
      setExp(e); setMode(e.info.mode);
      setRows(e.info.sensors.map((s) => ({ name: s.name, include: s.include, reference: s.reference, compound: s.compound, conc: s.concs[0] ?? "", exp: s.exp })));
      setOpt((o) => ({ ...o, nPoints: Math.min(o.nPoints, Math.max(...e.info.sensors.map((s) => s.nAssoc), 2)) }));
    } catch (x) { setErr(String(x.message || x)); }
  };
  const upd = (name, patch) => setRows((rs) => rs.map((r) => (r.name === name ? { ...r, ...patch } : r)));
  const setRef = (name) => setRows((rs) => { const e = rs.find((r) => r.name === name)?.exp; return rs.map((r) => (r.exp === e ? { ...r, reference: r.name === name, include: r.name === name ? true : r.include } : r)); });

  const maxPts = exp ? Math.max(...exp.info.sensors.filter((s) => s.nAssoc).map((s) => s.nAssoc)) : 8;
  const run = async () => {
    setBusy(true); setErr(""); await new Promise((r) => setTimeout(r, 30));
    try {
      const { results, settings } = analyze(exp.raw, exp.info, { mode, nPoints: +opt.nPoints, bulk: opt.bulk, refSubtract: opt.refSubtract, normalize: opt.normalize, sensors: rows });
      setOut({ results, settings, svgs: results.map((r) => figureSvg(r, mode)), table: kdRows(results) });
    } catch (x) { setOut(null); setErr(String(x.message || x)); }
    setBusy(false);
  };
  const reset = () => { setExp(null); setRows([]); setOut(null); setErr(""); if (fileRef.current) fileRef.current.value = ""; };
  const meta = exp?.info.meta;

  // layout width in SVG units so that the 10-unit axis text comes out at fig.pt points
  const figW = Math.round((fig.wmm * 72) / 25.4 * 10 / fig.pt);
  const figHu = fig.hmm === "" ? undefined : Math.round(figW * (fig.hmm / fig.wmm));
  const figMin = fig.panels === "both" ? 600 : fig.panels === "kinetics" ? 330 : 190;
  const figOk = fig.wmm > 20 && fig.pt >= 4 && figW >= figMin && (fig.hmm === "" || fig.hmm > 15);
  const figSvgFor = (r) => {
    const o = { W: figW, H: figHu, title: fig.title, panels: fig.panels };
    let svg = figureSvg(r, mode, o);
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const hmm = fig.hmm === "" ? (+vb[2] * fig.wmm) / +vb[1] : +fig.hmm;
    svg = svg.replace(/ width="[\d.]+" height="[\d.]+">/, ` width="${fig.wmm}mm" height="${hmm.toFixed(2)}mm">`).replace("<svg ", '<svg font-family="Helvetica, Arial, sans-serif" ');
    return { svg, hmm };
  };
  const exportFigs = async (list) => {
    setFigBusy(true); setErr("");
    try {
      for (const r of list) {
        const { svg, hmm } = figSvgFor(r), base = `bli_${r.compound}_${fig.panels}_${fig.wmm}x${Math.round(hmm)}mm`.replace(/[^\w.-]+/g, "_");
        if (fig.fmt === "svg") { dl(blobUrl(svg, "image/svg+xml"), base + ".svg"); continue; }
        const { jsPDF } = await import("jspdf"); await import("svg2pdf.js"); const { loadFont } = await import("../lib/labnotepdf");
        const doc = new jsPDF({ unit: "mm", format: [fig.wmm, hmm], orientation: fig.wmm >= hmm ? "l" : "p", compress: true });
        await loadFont(doc, "NotoSansKR-Subset-Regular.ttf", "normal"); await loadFont(doc, "NotoSansKR-Subset-Bold.ttf", "bold");
        const holder = document.createElement("div"); holder.style.cssText = "position:fixed;left:-99999px;top:0"; holder.innerHTML = svg.replace(/ width="[\d.]+mm" height="[\d.]+mm">/, ">"); document.body.appendChild(holder);
        const el = holder.querySelector("svg"); const vb = el.getAttribute("viewBox").split(" ").map(Number);
        el.setAttribute("width", vb[2]); el.setAttribute("height", vb[3]);
        el.setAttribute("font-family", "NotoSansKR"); el.querySelectorAll("text").forEach((t) => { t.setAttribute("font-family", "NotoSansKR"); t.style.fontFamily = "NotoSansKR"; if (t.getAttribute("font-weight")) t.setAttribute("font-weight", "bold"); });
        await doc.svg(el, { x: 0, y: 0, width: fig.wmm, height: hmm }); holder.remove();
        doc.save(base + ".pdf");
        await new Promise((x) => setTimeout(x, 250));
      }
    } catch (e) { console.error(e); setErr("Could not export the figure: " + (e?.message || e)); }
    setFigBusy(false);
  };

  const makeNote = async () => {
    setNoteBusy(true); setNoteErr("");
    try {
      try { localStorage.setItem("labNoteWho", note.who); } catch {}
      const { buildLabNote } = await import("../lib/labnotepdf");
      const s = out.settings;
      const temps = [...new Set(Object.values(exp.raw).flatMap((p) => p.steps.filter((x) => x.stype === "ASSOC").map((x) => x.temp)).filter(Number.isFinite))];
      const blocks = [
        { t: "h", text: "BLI kinetics (Octet)" },
        { t: "kv", rows: [
          ["Experiment", meta.expName || "–"], ["Run ID", meta.runId || "–"], ["Started", meta.start || "–"], ["Instrument", meta.instrument || "–"],
          ["Sensor", meta.sensorType || "–"], ["Assay temperature", temps.length ? temps.map((t) => `${t} °C`).join(", ") : "–"],
          ["Layout", s.mode === "single" ? `Single cycle, first ${s.nPoints} concentration points` : "One concentration per sensor, global fit per compound"],
          ["Reference sensor", s.reference], ["Bulk offset term", s.bulk ? "on" : "off"], ["Loading normalisation", s.normalize ? "on" : "off"],
          ["Excluded sensors", s.excluded.join(", ") || "none"], ["Files", Object.values(exp.raw).map((p) => p.file).join(", ")],
        ] },
        { t: "table", title: "Kinetic and steady-state constants", head: KD_HEAD, rows: out.table, fontSize: 7.5, widths: [22, 16, 30, 20, 20, 18, 20, 26, 16, 16, 12, 0] },
        { t: "p", text: "Model: 1:1 Langmuir; KD = koff/kon. For one sensor the 95% fit CI reflects fit noise only and ignores systematic deviations, so it is optimistic. Repeats are fitted separately and given as mean ± SD (n = sensors). KD SS is a Langmuir fit of the end-of-association responses with the bulk offset removed." },
      ];
      out.results.forEach((r, i) => { blocks.push({ t: "h", text: `${r.compound} (${r.nRep > 1 ? "sensors" : "sensor"} ${r.sensors})` }); blocks.push({ t: "svg", svg: out.svgs[i] }); if (r.flags) blocks.push({ t: "p", text: "Flags: " + r.flags }); });
      await buildLabNote({ blocks, meta: { ...note, tool: "BLI fit", title: note.title.trim() || `BLI kinetics · ${meta.expName || "Octet run"}` }, orientation: "landscape", filename: `labnote_${note.date || "date"}_bli.pdf` });
    } catch (e) { console.error(e); setNoteErr("Could not make the PDF: " + (e?.message || e)); }
    setNoteBusy(false);
  };

  const isSingle = mode === "single";
  const stat = useMemo(() => (exp ? `${meta.expName || "Experiment"} · ${meta.instrument} · ${exp.info.sensors.length} sensors` : ""), [exp, meta]);

  return (
    <>
      <section className="pv-hero">
        <div className="container">
          <p className="eyebrow">Tools / 04 Assay and SAR</p>
          <div className="pv-titlerow">
            <h1 className="team-title"><span className="light">BLI</span> <span>fit</span></h1>
            <div className="pv-acts">
              <button className="pv-btn" onClick={() => setNoteOpen((o) => !o)} aria-expanded={noteOpen} disabled={!out}>Lab note PDF</button>
              <button className="pv-btn" onClick={reset} disabled={!exp}>Clear</button>
            </div>
          </div>
          <p className="sq-lede">Fit Octet sensorgrams to get kon, koff and KD. Drop the .frd files from a run, mark the sensors to leave out, choose the reference sensor and the compound IDs, then run the fit. Everything is calculated in your browser and no file leaves your computer.</p>
        </div>
      </section>

      <div className="container pv-wrap">
        <div className="pv">
          <section className={`pv-card bli-drop ${over ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); readFiles(e.dataTransfer.files); }}>
            <p className="pv-lbl">1 · Data</p>
            <div className="pv-row">
              <button className="pv-btn pv-primary" onClick={() => fileRef.current?.click()}>Choose .frd files</button>
              <input ref={fileRef} type="file" accept=".frd" multiple hidden onChange={(e) => readFiles(e.target.files)} />
              <span className="pv-small" style={{ margin: 0 }}>{exp ? stat : "or drop them here, one file per sensor (the .fmx, .fmf and log files are not needed)"}</span>
            </div>
          </section>

          {err && <p className="pv-err" role="alert">{err}</p>}

          {noteOpen && out && (
            <section className="pv-card pp-note">
              <div className="pv-head"><p className="pv-lbl">Lab note PDF · BLI fit</p><button className="pv-chip" onClick={() => setNoteOpen(false)}>Close</button></div>
              <div className="pp-noterow">
                <Fld t="Date"><input className="pp-in" type="date" value={note.date} onChange={(e) => setNote({ ...note, date: e.target.value })} style={{ width: 150 }} /></Fld>
                <Fld t="Experimenter"><input className="pp-in" type="text" value={note.who} placeholder="Your name" style={{ width: 170 }} onChange={(e) => setNote({ ...note, who: e.target.value })} /></Fld>
                <Fld t="Title"><input className="pp-in" type="text" value={note.title} placeholder={`BLI kinetics · ${meta?.expName || "Octet run"}`} style={{ width: 300 }} onChange={(e) => setNote({ ...note, title: e.target.value })} /></Fld>
              </div>
              <label className="pp-fld" style={{ alignItems: "flex-start" }}><span>Notes (optional)</span><textarea className="pp-in" style={{ width: "min(420px,100%)", height: 58, padding: 8 }} value={note.notes} placeholder="Purpose, protein lot, buffer, …" onChange={(e) => setNote({ ...note, notes: e.target.value })} /></label>
              <label className="pp-chk"><input type="checkbox" checked={note.sign} onChange={(e) => setNote({ ...note, sign: e.target.checked })} /> Add signature lines at the end</label>
              {noteErr && <p className="pv-err" role="alert">{noteErr}</p>}
              <div className="pv-row"><button className="pv-btn pv-primary" onClick={makeNote} disabled={noteBusy}>{noteBusy ? "Making PDF…" : "Download PDF"}</button><span className="pv-small" style={{ margin: 0 }}>The PDF holds the run details, the constants table and the fit of every compound, with the aLaDDIN and KRICT logos, the date and the experimenter.</span></div>
            </section>
          )}

          {exp && (
            <div className="pv-main">
              <section className="pv-card pp-cfg">
                <p className="pv-lbl">2 · Layout and options</p>
                <label className="pp-chk"><input type="radio" checked={isSingle} onChange={() => setMode("single")} /> Single cycle: one sensor, ascending concentrations</label>
                <label className="pp-chk"><input type="radio" checked={!isSingle} onChange={() => setMode("multi")} /> One concentration per sensor, same compound</label>
                <p className="pv-small" style={{ margin: 0 }}>Detected from the files: {exp.info.mode === "single" ? "single cycle" : "one concentration per sensor"}.</p>
                {isSingle && <Fld t="Use the first N concentrations"><Num v={opt.nPoints} set={(v) => setOpt({ ...opt, nPoints: v })} w={70} min={3} max={maxPts} /></Fld>}
                {isSingle && <p className="pv-small" style={{ margin: 0 }}>Lower N to drop the high concentrations that fit poorly. This run has {maxPts}.</p>}
                <label className="pp-chk"><input type="checkbox" checked={opt.refSubtract} onChange={(e) => setOpt({ ...opt, refSubtract: e.target.checked })} /> Subtract the reference sensor</label>
                <label className="pp-chk"><input type="checkbox" checked={opt.bulk} onChange={(e) => setOpt({ ...opt, bulk: e.target.checked })} /> Fit a bulk offset (concentration-independent jump, e.g. DMSO mismatch)</label>
                <label className="pp-chk"><input type="checkbox" checked={opt.normalize} onChange={(e) => setOpt({ ...opt, normalize: e.target.checked })} /> Scale each sensor by its loading level</label>
                <div className="pv-row"><button className="pv-btn pv-primary" onClick={run} disabled={busy}>{busy ? "Fitting…" : "Run fit"}</button></div>
              </section>

              <section className="pv-card pp-out">
                <p className="pv-lbl">Sensors and compound IDs</p>
                <div className="sq-scroll"><table className="sq-table pp-tbl"><thead><tr>
                  <th>Use</th><th>Reference</th><th>Sensor</th><th>Loading (nm)</th><th>Compound ID</th><th>{isSingle ? "Concentrations" : <Hd h="Conc. (µM)" />}</th></tr></thead><tbody>
                  {exp.info.sensors.map((s) => { const r = rows.find((x) => x.name === s.name) || {}; return (
                    <tr key={s.name} className={r.include ? "" : "bli-off"}>
                      <td><input type="checkbox" checked={!!r.include} disabled={r.reference} onChange={(e) => upd(s.name, { include: e.target.checked })} aria-label={`use ${s.name}`} /></td>
                      <td><input type="radio" name="bli-ref" checked={!!r.reference} onChange={() => setRef(s.name)} aria-label={`reference ${s.name}`} /></td>
                      <td><b>{s.name}</b>{exp.info.nExp > 1 && <span className="bli-tag">run {s.expNo}</span>}{s.lowLoad && <span className="bli-tag">low loading</span>}{s.isBuffer && <span className="bli-tag">buffer only</span>}</td>
                      <td>{s.load == null ? "–" : s.load.toFixed(3)}</td>
                      <td><input className="pp-in" type="text" value={r.compound ?? ""} style={{ width: 150 }} onChange={(e) => upd(s.name, { compound: e.target.value })} aria-label={`compound ID of ${s.name}`} /></td>
                      <td>{isSingle ? <span className="pv-small">{s.nAssoc ? s.concs.slice(0, 8).map(fmtC).join(", ") : "–"}</span> : <Num v={r.conc} set={(v) => upd(s.name, { conc: v })} w={90} min={0} />}</td>
                    </tr>); })}
                </tbody></table></div>
                <p className="pv-small">Sensors with the same compound ID are treated as repeats of one compound. In single cycle each sensor is fitted on its own and the table gives the mean ± SD (n = number of sensors). With one concentration per sensor they are fitted together. When several runs are loaded, each run is subtracted with its own reference sensor. The compound ID is read from the sample ID in the file and can be edited. Sensors that loaded poorly or saw only buffer are switched off by default.</p>
              </section>
            </div>
          )}

          {out && (<>
            <section className="pv-card">
              <div className="pv-head"><p className="pv-lbl">3 · Results</p>
                <div className="pv-row">
                  <button className="pv-chip pv-go" onClick={() => setNoteOpen(true)}>Lab note PDF</button>
                  <button className="pv-chip" onClick={() => dl(blobUrl("﻿" + toCsv(out.table), "text/csv"), "bli_kd_table.csv")}>Download CSV</button>
                </div></div>
              <div className="sq-scroll"><table className="sq-table pp-tbl"><thead><tr>{KD_HEAD.map((h) => <th key={h}><Hd h={h} /></th>)}</tr></thead><tbody>
                {out.table.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j === 5 ? "bli-kd" : j === 11 ? "bli-flag" : ""} style={j === 11 ? { whiteSpace: "normal", minWidth: 170 } : undefined}>{c}</td>)}</tr>)}
              </tbody></table></div>
              <p className="pv-small">1:1 model; KD = koff/kon. A compound measured on one sensor gets a 95% fit CI, which reflects fit noise only and is optimistic. Repeats (several sensors with the same compound ID in single cycle) are fitted separately and shown as mean ± SD, and the steady-state plot shows the mean ± SD of the end-of-association response at each concentration. KD SS is a Langmuir fit of all end-of-association responses with the bulk offset removed. Check the curves before you use a number.</p>
              <p className="pv-small">{out.settings.mode === "single" ? `Single cycle, first ${out.settings.nPoints} concentrations` : "One concentration per sensor"} · reference {out.settings.reference} · bulk offset {out.settings.bulk ? "on" : "off"} · excluded: {out.settings.excluded.join(", ") || "none"}</p>
            </section>
            <section className="pv-card pp-cfg bli-export">
              <p className="pv-lbl">Figure export for papers</p>
              <div className="pp-noterow">
                <Fld t="Width (mm)"><Num v={fig.wmm} set={(v) => setFig({ ...fig, wmm: v })} w={72} min={20} /></Fld>
                <Fld t="Height (mm)"><Num v={fig.hmm} set={(v) => setFig({ ...fig, hmm: v })} w={72} min={15} /></Fld>
                <Fld t="Text size (pt)"><Num v={fig.pt} set={(v) => setFig({ ...fig, pt: v })} w={60} min={4} max={14} /></Fld>
                <Fld t="Panels"><select className="pp-in" value={fig.panels} onChange={(e) => setFig({ ...fig, panels: e.target.value })}><option value="both">Sensorgram + steady-state</option><option value="kinetics">Sensorgram only</option><option value="ss">Steady-state only</option></select></Fld>
                <Fld t="Format"><select className="pp-in" value={fig.fmt} onChange={(e) => setFig({ ...fig, fmt: e.target.value })}><option value="pdf">PDF (vector)</option><option value="svg">SVG (vector)</option></select></Fld>
              </div>
              <div className="pv-row">
                <button className="pv-chip" onClick={() => setFig({ ...fig, wmm: 85, hmm: "", panels: "kinetics" })}>1 column · 85 mm</button>
                <button className="pv-chip" onClick={() => setFig({ ...fig, wmm: 120, hmm: "", panels: "both" })}>1.5 column · 120 mm</button>
                <button className="pv-chip" onClick={() => setFig({ ...fig, wmm: 180, hmm: "", panels: "both" })}>2 columns · 180 mm</button>
              </div>
              <label className="pp-chk"><input type="checkbox" checked={fig.title} onChange={(e) => setFig({ ...fig, title: e.target.checked })} /> Include the title lines (compound, KD, kon, koff)</label>
              <p className="pv-small" style={{ margin: 0 }}>Leave the height empty to keep the natural proportions. The figure is drawn at the exact size, so text is the chosen size in the paper. The PDF embeds Noto Sans; the SVG uses Helvetica/Arial, so it opens with your own font in Illustrator or Inkscape. {!figOk && <b style={{ color: "#B3261E" }}>This size is too small for the chosen panels at this text size. Increase the width, lower the text size, or show one panel.</b>}</p>
              <div className="pv-row">
                <button className="pv-btn pv-primary" disabled={!figOk || figBusy} onClick={() => exportFigs(out.results)}>{figBusy ? "Exporting…" : `Export all (${out.results.length})`}</button>
                <span className="pv-small" style={{ margin: 0 }}>or use the export button on each compound below.</span>
              </div>
            </section>
            {out.results.map((r, i) => (
              <section className="pv-card" key={r.compound + i}>
                <div className="pv-head"><p className="pv-lbl">{r.compound} · {r.nRep > 1 ? `${r.nRep} repeats · ` : ""}sensor {r.sensors}</p>
                  <div className="pv-row"><button className="pv-chip pv-go" disabled={!figOk || figBusy} onClick={() => exportFigs([r])}>Export {fig.fmt.toUpperCase()} · {fig.wmm} mm</button></div></div>
                <div className="bli-fig" dangerouslySetInnerHTML={{ __html: out.svgs[i] }} />
                {r.flags && <p className="me-flag warn">{r.flags}</p>}
              </section>
            ))}
          </>)}
        </div>
      </div>
    </>
  );
}
