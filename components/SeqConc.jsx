"use client";
import { useMemo, useState } from "react";
import { ExpressionCard, CodonCard, PurificationCards } from "./SeqExtras";
import { AA, EGFP, PROTEASES, TAGS, analyze, charge, findMotifs, fmt, parseSequence } from "../lib/seqtools";

const num = (v, d) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };

export default function SeqConc() {
  const [text, setText] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ec, setEc] = useState("ox");
  const [mwM, setMwM] = useState("");
  const [eM, setEM] = useState("");
  const [a280, setA280] = useState("");
  const [a260, setA260] = useState("");
  const [path, setPath] = useState("1");
  const [dil, setDil] = useState("1");
  const [pH, setPH] = useState("8.0");
  const [cf, setCf] = useState("");
  const [vf, setVf] = useState("");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseSequence(text), [text]);
  const full = parsed.seq;
  const s0 = Math.max(1, Math.round(num(from, 1))), s1 = Math.min(full.length, Math.round(num(to, full.length)));
  const seq = full.slice(s0 - 1, Math.max(s0, s1));
  const a = useMemo(() => analyze(seq), [seq]);

  const motifs = useMemo(() => ({ tags: findMotifs(full, TAGS), prot: findMotifs(full, PROTEASES) }), [full]);
  const frags = useMemo(() => motifs.prot.map((p) => {
    const cut = p.start - 1 + p.cut;
    return { p, cut, n: analyze(full.slice(0, cut)), c: analyze(full.slice(cut)) };
  }), [motifs, full]);

  const manual = ec === "manual";
  const mw = manual ? num(mwM, NaN) : a?.mw;
  const eps = manual ? num(eM, NaN) : a ? (ec === "red" ? a.eRed : a.eOx) : NaN;
  const A = num(a280, NaN), L = num(path, 1), D = num(dil, 1);
  const cM = A * D / (eps * L);
  const mgml = cM * mw, uM = cM * 1e6;
  const A260 = num(a260, NaN);
  const layne = 1.55 * A - 0.76 * A260;
  const pHv = num(pH, 8);
  const z = a ? charge(a.c, pHv) : NaN;
  const Vs = (num(cf, NaN) * num(vf, NaN)) / mgml;

  const curve = useMemo(() => (a ? Array.from({ length: 57 }, (_, i) => [i * 0.25, charge(a.c, i * 0.25)]) : []), [a]);

  const copy = () => {
    if (!a) return;
    const t = [`Length\t${a.n} aa (${s0}-${s0 + a.n - 1})`, `MW\t${fmt(a.mw, 1)} Da`, `ε280 (cystines formed)\t${fmt(a.eOx, 0)} M-1cm-1`, `ε280 (reduced)\t${fmt(a.eRed, 0)} M-1cm-1`, `A280 (1 mg/mL)\t${a.a280Ox.toFixed(3)}`, `pI\t${a.pi.toFixed(2)}`, `Net charge at pH ${pHv}\t${z.toFixed(1)}`].join("\n");
    try { navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };

  return (
    <>
      <section className="pv-hero">
        <div className="container">
          <p className="eyebrow">Tools / 01 Structure</p>
          <div className="pv-titlerow">
            <h1 className="team-title"><span className="light">Seq</span> <span>/ conc</span></h1>
            <div className="pv-acts">
              <button className="pv-btn" onClick={() => { setText(EGFP); setFrom(""); setTo(""); }}>Example (EGFP)</button>
              <button className="pv-btn pv-primary" onClick={copy} disabled={!a}>{copied ? "Copied" : "Copy results"}</button>
            </div>
          </div>
          <p className="sq-lede">Paste a protein sequence to get its molecular weight, extinction coefficient and charge, then turn an A280 reading into a concentration. Tag and protease sites are listed for purification planning.</p>
        </div>
      </section>

      <div className="container pv-wrap">
        <div className="pv">
          <section className="pv-card">
            <p className="pv-lbl">Sequence</p>
            <textarea className="sq-ta" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Paste the amino acid sequence here (one-letter code, FASTA is fine)"} spellCheck="false" aria-label="Protein sequence" />
            <div className="pv-row pv-end">
              <label className="pv-fld sq-s">Residues from<input inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="1" /></label>
              <label className="pv-fld sq-s">to<input inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value)} placeholder={full.length ? String(full.length) : "end"} /></label>
              <span className="pv-small">{full.length ? `${full.length} residues read${a && a.n !== full.length ? `, analysing ${a.n}` : ""}` : "Use the range to analyse a construct, for example without a signal peptide."}</span>
            </div>
            {parsed.ignored.length > 0 && <p className="pv-small">Ignored characters: {parsed.ignored.join(" ")} (not one of the 20 standard amino acids).</p>}
          </section>

          {a && (
            <div className="sq-stats">
              <Stat k="Length" v={`${a.n}`} u="aa" />
              <Stat k="Molecular weight" v={fmt(a.mw / 1000, 2)} u="kDa" sub={`${fmt(a.mw, 1)} Da`} />
              <Stat k="ε280" v={fmt(a.eOx, 0)} u="M⁻¹cm⁻¹" sub={`${fmt(a.eRed, 0)} if all Cys reduced`} />
              <Stat k="A280 of 1 mg/mL" v={a.a280Ox.toFixed(3)} sub={`${a.a280Red.toFixed(3)} reduced`} />
              <Stat k="Theoretical pI" v={a.pi.toFixed(2)} />
              <Stat k={`Net charge at pH ${fmt(pHv, 1)}`} v={`${z > 0 ? "+" : ""}${z.toFixed(1)}`} />
            </div>
          )}
          {a && a.eOx < 5500 && <p className="sq-warn">This sequence has little Trp and Tyr (ε280 {fmt(a.eOx, 0)}). A280 will be a weak and unreliable signal; consider A205 or a colorimetric assay.</p>}

          <div className="pv-main sq-two">
            <section className="pv-card sq-col">
              <p className="pv-lbl">Concentration from absorbance</p>
              <div className="pv-row">{[["ox", "ε, cystines formed"], ["red", "ε, reduced"], ["manual", "Enter MW and ε"]].map(([k, t]) => <button key={k} className={`pv-chip${ec === k ? " on" : ""}`} onClick={() => setEc(k)}>{t}</button>)}</div>
              {manual && (
                <div className="pv-row pv-end">
                  <label className="pv-fld">MW (Da)<input inputMode="decimal" value={mwM} onChange={(e) => setMwM(e.target.value)} /></label>
                  <label className="pv-fld">ε280 (M⁻¹cm⁻¹)<input inputMode="decimal" value={eM} onChange={(e) => setEM(e.target.value)} /></label>
                </div>
              )}
              <div className="pv-row pv-end">
                <label className="pv-fld">A280<input inputMode="decimal" value={a280} onChange={(e) => setA280(e.target.value)} placeholder="0.85" /></label>
                <label className="pv-fld">Path length (cm)<input inputMode="decimal" value={path} onChange={(e) => setPath(e.target.value)} /></label>
                <label className="pv-fld">Dilution factor<input inputMode="decimal" value={dil} onChange={(e) => setDil(e.target.value)} /></label>
              </div>
              <div className="sq-out">
                <div><span>{Number.isFinite(mgml) ? fmt(mgml, 3) : "–"}</span> mg/mL</div>
                <div><span>{Number.isFinite(uM) ? fmt(uM, 2) : "–"}</span> µM</div>
              </div>
              <p className="pv-small">c = A × dilution ÷ (ε × path length). Uses ε = {fmt(eps, 0)} M⁻¹cm⁻¹ and MW = {fmt(mw, 1)} Da.</p>
              <label className="pv-fld sq-s">A260 (optional, to correct for nucleic acid)<input inputMode="decimal" value={a260} onChange={(e) => setA260(e.target.value)} /></label>
              {Number.isFinite(layne) && Number.isFinite(A260) && <p className="pv-small">Warburg–Christian style estimate, independent of sequence: <b>{fmt(layne, 3)} mg/mL</b> (1.55 × A280 − 0.76 × A260, 1 cm path). A260/A280 = {fmt(A260 / A, 2)}; pure protein is near 0.57.</p>}
            </section>

            <section className="pv-card sq-col">
              <p className="pv-lbl">Dilution for the next step</p>
              <p className="pv-small">Uses the stock concentration calculated on the left.</p>
              <div className="pv-row pv-end">
                <label className="pv-fld">Final concentration (mg/mL)<input inputMode="decimal" value={cf} onChange={(e) => setCf(e.target.value)} /></label>
                <label className="pv-fld">Final volume (µL)<input inputMode="decimal" value={vf} onChange={(e) => setVf(e.target.value)} /></label>
              </div>
              <div className="sq-out">
                <div><span>{Number.isFinite(Vs) ? fmt(Vs, 1) : "–"}</span> µL stock</div>
                <div><span>{Number.isFinite(Vs) ? fmt(num(vf, 0) - Vs, 1) : "–"}</span> µL buffer</div>
              </div>
              {Number.isFinite(Vs) && Vs > num(vf, 0) && <p className="sq-warn">The stock is more dilute than the target, so it needs to be concentrated first.</p>}
              <p className="pv-lbl" style={{ marginTop: 10 }}>Ion exchange hint</p>
              <label className="pv-fld sq-s">Buffer pH<input inputMode="decimal" value={pH} onChange={(e) => setPH(e.target.value)} /></label>
              {a && <p className="pv-small">{Math.abs(z) < 1 ? `Net charge is near zero at pH ${fmt(pHv, 1)}, close to the pI (${a.pi.toFixed(2)}); binding to either resin will be weak.` : z < 0 ? `Net charge ${z.toFixed(1)} at pH ${fmt(pHv, 1)}: expected to bind an anion exchanger (Q, DEAE). The pH is ${(pHv - a.pi).toFixed(1)} above the pI.` : `Net charge +${z.toFixed(1)} at pH ${fmt(pHv, 1)}: expected to bind a cation exchanger (S, SP). The pH is ${(a.pi - pHv).toFixed(1)} below the pI.`}</p>}
            </section>
          </div>

          {a && (
            <section className="pv-card">
              <p className="pv-lbl">Net charge by pH</p>
              <Chart curve={curve} pi={a.pi} pH={pHv} />
            </section>
          )}

          {full.length > 0 && (
            <section className="pv-card">
              <p className="pv-lbl">Tags and protease sites (whole sequence)</p>
              {motifs.tags.length + motifs.prot.length === 0 ? <p className="pv-small">No common affinity tag or protease site was found.</p> : (
                <table className="sq-table"><thead><tr><th>Feature</th><th>Position</th><th>Note</th></tr></thead><tbody>
                  {[...motifs.tags, ...motifs.prot].sort((x, y) => x.start - y.start).map((m, i) => (
                    <tr key={i}><td>{m.name}</td><td>{m.start}–{m.end}</td><td>{m.note || (m.start <= 25 ? "N-terminal" : m.end >= full.length - 25 ? "C-terminal" : "internal")}</td></tr>))}
                </tbody></table>
              )}
              {frags.length > 0 && (<>
                <p className="pv-lbl" style={{ marginTop: 8 }}>After cleavage</p>
                <div className="sq-scroll"><table className="sq-table"><thead><tr><th>Protease</th><th>Fragment</th><th>Residues</th><th>MW (Da)</th><th>ε280</th><th>pI</th></tr></thead><tbody>
                  {frags.flatMap((f, i) => [
                    <tr key={`${i}n`}><td rowSpan="2">{f.p.name}</td><td>N-terminal</td><td>1–{f.cut}</td><td>{fmt(f.n?.mw, 1)}</td><td>{fmt(f.n?.eOx, 0)}</td><td>{f.n ? f.n.pi.toFixed(2) : "–"}</td></tr>,
                    <tr key={`${i}c`}><td>C-terminal</td><td>{f.cut + 1}–{full.length}</td><td>{fmt(f.c?.mw, 1)}</td><td>{fmt(f.c?.eOx, 0)}</td><td>{f.c ? f.c.pi.toFixed(2) : "–"}</td></tr>,
                  ])}
                </tbody></table></div>
                <p className="pv-small">Cleavage leaves 1 to 5 extra residues from the site on the cleaved protein. The fragment values include them as shown.</p>
              </>)}
            </section>
          )}

          {a && (
            <section className="pv-card">
              <p className="pv-lbl">Composition and other properties</p>
              <div className="sq-props">
                <span>Positive (K+R) <b>{a.pos}</b></span><span>Negative (D+E) <b>{a.neg}</b></span><span>Cys <b>{a.c.C}</b></span><span>Met <b>{a.c.M}</b></span>
                <span>Trp <b>{a.c.W}</b></span><span>Tyr <b>{a.c.Y}</b></span><span>His <b>{a.c.H}</b></span><span>Hydrophobic <b>{a.hydrophobicPct.toFixed(1)}%</b></span>
                <span>GRAVY <b>{a.gravy.toFixed(3)}</b></span><span>Aliphatic index <b>{a.ali.toFixed(1)}</b></span>
              </div>
              <div className="sq-comp">
                {[...AA].sort((x, y) => a.c[y] - a.c[x]).map((r) => (
                  <div key={r} className="sq-bar" title={`${r}: ${a.c[r]}`}><i style={{ height: `${(a.c[r] / Math.max(...Object.values(a.c))) * 100}%` }} /><b>{r}</b><small>{a.c[r]}</small></div>
                ))}
              </div>
              <p className="pv-small">MW is the average mass of the full chain. ε280 follows Pace et al. (Trp 5500, Tyr 1490, cystine 125 M⁻¹cm⁻¹). pI and charge use the EMBOSS pKa set, which can differ from other tools by a few tenths of a pH unit. GRAVY uses the Kyte–Doolittle scale.</p>
            </section>
          )}
          <ExpressionCard seq={seq} a={a} pH={pHv} />
          <CodonCard protein={full} onUseProtein={(p) => { setText(p); setFrom(""); setTo(""); }} />
          <PurificationCards a={a} mgml={mgml} frags={frags} />
        </div>
      </div>
    </>
  );
}

function Stat({ k, v, u, sub }) {
  return <div className="sq-stat"><p>{k}</p><b>{v}{u && <small> {u}</small>}</b>{sub && <em>{sub}</em>}</div>;
}

function Chart({ curve, pi, pH }) {
  const W = 640, H = 230, m = { l: 44, r: 14, t: 14, b: 34 };
  const ys = curve.map((p) => p[1]); const lo = Math.min(...ys, -1), hi = Math.max(...ys, 1);
  const X = (x) => m.l + (x / 14) * (W - m.l - m.r), Y = (y) => m.t + ((hi - y) / (hi - lo)) * (H - m.t - m.b);
  const d = curve.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(" ");
  const step = hi - lo > 40 ? 10 : 5; const ticks = []; for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sq-chart" role="img" aria-label="Net charge versus pH">
      {ticks.map((t) => <g key={t}><line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? "#999" : "#eee"} /><text x={m.l - 6} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="#666">{t}</text></g>)}
      {[0, 2, 4, 6, 8, 10, 12, 14].map((t) => <text key={t} x={X(t)} y={H - 14} textAnchor="middle" fontSize="11" fill="#666">{t}</text>)}
      <text x={(m.l + W - m.r) / 2} y={H - 1} textAnchor="middle" fontSize="11" fill="#666">pH</text>
      <path d={d} fill="none" stroke="#F39800" strokeWidth="2.4" />
      <line x1={X(pi)} x2={X(pi)} y1={m.t} y2={H - m.b} stroke="#17181A" strokeDasharray="4 4" /><text x={X(pi) + 5} y={m.t + 10} fontSize="11" fill="#17181A">pI {pi.toFixed(2)}</text>
      {pH >= 0 && pH <= 14 && <><line x1={X(pH)} x2={X(pH)} y1={m.t} y2={H - m.b} stroke="#8F6CC0" strokeDasharray="2 3" /><text x={X(pH) + 5} y={H - m.b - 6} fontSize="11" fill="#8F6CC0">buffer pH {pH}</text></>}
    </svg>
  );
}
