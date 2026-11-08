"use client";
import { useEffect, useMemo, useState } from "react";
import { GELS, HOSTS, LADDER, ROSETTA, analyze, charge, codonReport, cysPositions, fitSEC, fmt, gelY, hydropathy, parseDNA, stretches, translate } from "../lib/seqtools";

const num = (v, d = NaN) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };

// ---------------- expression and solubility ----------------
export function ExpressionCard({ seq, a, pH }) {
  const cys = useMemo(() => cysPositions(seq), [seq]);
  const prof = useMemo(() => hydropathy(seq, 9), [seq]);
  const hyd = useMemo(() => stretches(seq, 9, 1.6, 9), [seq]);
  const tm = useMemo(() => stretches(seq, 19, 1.6, 19), [seq]);
  if (!a) return null;
  const inStretch = hyd.reduce((s, r) => s + (r.end - r.start + 1), 0);
  const z = charge(a.c, pH), dens = Math.abs(z) / a.n;
  const notes = [];
  if (tm.length) notes.push(`${tm.length} stretch${tm.length > 1 ? "es" : ""} of 19 residues with an average hydropathy above 1.6 (a pattern seen in transmembrane helices). Expect low solubility without detergent unless this is a membrane or signal sequence.`);
  if (hyd.length && !tm.length) notes.push(`${hyd.length} hydrophobic stretch${hyd.length > 1 ? "es" : ""} found (${inStretch} residues, ${((inStretch / a.n) * 100).toFixed(0)}% of the sequence). These can pull the protein into inclusion bodies or aggregates.`);
  if (a.gravy > 0) notes.push(`GRAVY is positive (${a.gravy.toFixed(2)}); most soluble globular proteins are negative.`);
  if (dens < 0.02) notes.push(`Net charge at pH ${fmt(pH, 1)} is ${z.toFixed(1)} (${(dens * 100).toFixed(1)} per 100 residues). Little electrostatic repulsion, so the protein may precipitate near this pH. Move the buffer pH away from the pI (${a.pi.toFixed(2)}) or add salt or glycerol.`);
  if (!notes.length) notes.push("No hydrophobic stretch above the threshold and the net charge is not close to zero. Nothing here predicts a solubility problem, but this is only a rough sequence-based screen.");
  const W = 640, H = 170, m = { l: 36, r: 12, t: 10, b: 26 };
  const X = (x) => m.l + (x / seq.length) * (W - m.l - m.r), Y = (y) => m.t + ((4.5 - y) / 9) * (H - m.t - m.b);
  const path = prof.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(" ");
  const odd = cys.length % 2 === 1;
  return (
    <section className="pv-card">
      <p className="pv-lbl">Expression and solubility (sequence-based screen)</p>
      <div className="pv-main sq-two">
        <div className="sq-col sq-sub">
          <p className="pv-lbl">Cysteines</p>
          {cys.length === 0 ? <p className="pv-small">No cysteine. There is no disulfide or free thiol to manage.</p> : (<>
            <p className="pv-small"><b>{cys.length}</b> Cys at {cys.join(", ")}. Up to <b>{Math.floor(cys.length / 2)}</b> disulfide bond{Math.floor(cys.length / 2) === 1 ? "" : "s"} possible{odd ? ", and at least one Cys stays free" : ""}.</p>
            <ul className="sq-list">
              <li>E. coli cytoplasm is reducing, so disulfides usually do not form there. For a disulfide-bonded protein, consider periplasmic export or an oxidizing strain (SHuffle, Origami).</li>
              {(odd || cys.length > 0) && <li>Free Cys can cause dimers and aggregation during purification. Include 1–5 mM DTT or 0.5–1 mM TCEP in the buffers if the protein does not need its disulfides.</li>}
              <li>ε280 changes by {fmt(a.eOx - a.eRed, 0)} M⁻¹cm⁻¹ between the oxidized and reduced forms.</li>
            </ul>
          </>)}
        </div>
        <div className="sq-col sq-sub">
          <p className="pv-lbl">Rough risk notes</p>
          <ul className="sq-list">{notes.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      </div>
      <p className="pv-lbl">Hydropathy profile (Kyte–Doolittle, window 9)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="sq-chart" role="img" aria-label="Hydropathy profile along the sequence">
        {[-4, -2, 0, 2, 4].map((t) => <g key={t}><line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? "#999" : "#eee"} /><text x={m.l - 5} y={Y(t) + 4} textAnchor="end" fontSize="10" fill="#666">{t}</text></g>)}
        <line x1={m.l} x2={W - m.r} y1={Y(1.6)} y2={Y(1.6)} stroke="#D9577F" strokeDasharray="4 4" /><text x={W - m.r} y={Y(1.6) - 4} textAnchor="end" fontSize="10" fill="#D9577F">1.6</text>
        {hyd.map((r, i) => <rect key={i} x={X(r.start)} y={m.t} width={Math.max(2, X(r.end) - X(r.start))} height={H - m.t - m.b} fill="#D9577F" opacity=".12" />)}
        <path d={path} fill="none" stroke="#F39800" strokeWidth="1.8" />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <text key={f} x={X(f * seq.length)} y={H - 8} textAnchor="middle" fontSize="10" fill="#666">{Math.round(f * seq.length) + (f === 0 ? 1 : 0)}</text>)}
      </svg>
      {hyd.length > 0 && <p className="pv-small">Hydrophobic stretches (average ≥ 1.6, 9 residues or longer): {hyd.map((r) => `${r.start}–${r.end}`).join(", ")}.</p>}
      <p className="pv-small">This screen uses sequence only. Surface hydrophobic patches need the 3D structure, and the real aggregation behavior depends on expression conditions.</p>
    </section>
  );
}

// ---------------- codon usage ----------------
export function CodonCard({ onUseProtein, protein }) {
  const [dna, setDna] = useState("");
  const [host, setHost] = useState("ecoli");
  const d = useMemo(() => parseDNA(dna), [dna]);
  const rep = useMemo(() => (d.length >= 3 ? codonReport(d, host) : null), [d, host]);
  const prot = useMemo(() => translate(d), [d]);
  return (
    <section className="pv-card">
      <p className="pv-lbl">Rare codons by expression host</p>
      <p className="pv-small">Paste the coding DNA (starting at ATG). The codon table values are approximate; a codon counts as rare when it is below 12% of the codons used for that amino acid.</p>
      <textarea className="sq-ta" style={{ minHeight: 100 }} value={dna} onChange={(e) => setDna(e.target.value)} placeholder="ATGGTGAGCAAGGGCGAGGAG…" spellCheck="false" aria-label="Coding DNA sequence" />
      <div className="pv-row">
        {Object.entries(HOSTS).map(([k, h]) => <button key={k} className={`pv-chip${host === k ? " on" : ""}`} onClick={() => setHost(k)}>{h.name}</button>)}
        {prot && prot !== protein && <button className="pv-chip" onClick={() => onUseProtein(prot)}>Use the translated protein ({prot.length} aa) above</button>}
      </div>
      {rep && (<>
        <div className="sq-stats">
          <div className="sq-stat"><p>Codons read</p><b>{rep.n}</b></div>
          <div className="sq-stat"><p>Rare codons</p><b>{rep.rare.length}</b><em>{((rep.rare.length / Math.max(1, rep.n)) * 100).toFixed(1)}% of codons</em></div>
          <div className="sq-stat"><p>Rare clusters</p><b>{rep.clusters.length}</b><em>2 or more within 5 codons</em></div>
          <div className="sq-stat"><p>CAI</p><b>{Number.isFinite(rep.cai) ? rep.cai.toFixed(2) : "–"}</b><em>closer to 1 is better adapted</em></div>
        </div>
        {rep.remainder !== 0 && <p className="sq-warn">The DNA length is not a multiple of 3 ({d.length} nt). Check the reading frame.</p>}
        {host === "ecoli" && rep.rare.some((r) => ROSETTA.has(r.codon)) && <p className="pv-small">{rep.rare.filter((r) => ROSETTA.has(r.codon)).length} of these rare codons are supplied by Rosetta 2 / BL21-CodonPlus tRNAs (AGG, AGA, AUA, CUA, CCC, GGA, CGG).</p>}
        {rep.rare.length > 0 && (
          <div className="sq-scroll sq-tall"><table className="sq-table"><thead><tr><th>Codon no.</th><th>Codon</th><th>Amino acid</th><th>Usage per 1000</th><th>Share of synonymous</th></tr></thead><tbody>
            {rep.rare.slice(0, 150).map((r) => <tr key={r.pos}><td>{r.pos}</td><td>{r.codon}</td><td>{r.aa}</td><td>{r.freq}</td><td>{(r.frac * 100).toFixed(1)}%</td></tr>)}
          </tbody></table></div>
        )}
        {rep.rare.length > 150 && <p className="pv-small">Showing the first 150 of {rep.rare.length}.</p>}
        {rep.clusters.length > 0 && <p className="pv-small">Clusters start at codon: {rep.clusters.map((c) => c[0].pos).join(", ")}.</p>}
      </>)}
    </section>
  );
}

// ---------------- purification: dialysis, SEC, SDS-PAGE ----------------
const STDS = [["Thyroglobulin", 669], ["Ferritin", 440], ["Aldolase", 158], ["Conalbumin", 75], ["Ovalbumin", 44], ["Carbonic anhydrase", 29], ["Ribonuclease A", 13.7], ["Aprotinin", 6.5]];

export function PurificationCards({ a, mgml, frags }) {
  // dialysis / concentration
  const [v1, setV1] = useState(""), [vd, setVd] = useState("1000"), [nEx, setNEx] = useState("2"), [v2, setV2] = useState(""), [rec, setRec] = useState("90");
  const c1 = mgml, V1 = num(v1), V2 = num(v2, V1), R = num(rec, 100) / 100;
  const c2 = (c1 * V1 * R) / V2, left = Math.pow(V1 / (V1 + num(vd)), num(nEx, 1));
  // SEC
  const [vo, setVo] = useState(""), [vt, setVt] = useState(""), [ves, setVes] = useState(STDS.map(() => "")), [meas, setMeas] = useState("");
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("seqconc-sec") || "null"); if (s) { setVo(s.vo || ""); setVt(s.vt || ""); setVes(s.ves || STDS.map(() => "")); } } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("seqconc-sec", JSON.stringify({ vo, vt, ves })); } catch {} }, [vo, vt, ves]);
  const fit = useMemo(() => fitSEC(STDS.map(([, mw], i) => ({ mw, ve: num(ves[i]) })), num(vo), num(vt)), [ves, vo, vt]);
  // SDS-PAGE
  const [gel, setGel] = useState("12%");
  if (!a) return null;
  const lanes = [{ name: "Full length", mw: a.mw / 1000 }];
  if (frags[0]) { lanes.push({ name: `${frags[0].p.name} N`, mw: (frags[0].n?.mw || 0) / 1000 }); lanes.push({ name: `${frags[0].p.name} C`, mw: (frags[0].c?.mw || 0) / 1000 }); }
  const GW = 120 + 70 * (lanes.length + 1), GH = 310, top = 34, bot = 280;
  const Yg = (mw) => top + gelY(mw, gel) * (bot - top);
  const inRange = (mw) => { const [lo, hi] = GELS[gel]; return mw >= lo && mw <= hi; };
  return (
    <>
      <section className="pv-card">
        <p className="pv-lbl">Dialysis and concentration</p>
        <div className="pv-row pv-end">
          <label className="pv-fld">Sample volume (mL)<input inputMode="decimal" value={v1} onChange={(e) => setV1(e.target.value)} /></label>
          <label className="pv-fld">Volume after (mL)<input inputMode="decimal" value={v2} onChange={(e) => setV2(e.target.value)} placeholder="same" /></label>
          <label className="pv-fld">Protein recovery (%)<input inputMode="decimal" value={rec} onChange={(e) => setRec(e.target.value)} /></label>
        </div>
        <div className="pv-row pv-end">
          <label className="pv-fld">Dialysate per exchange (mL)<input inputMode="decimal" value={vd} onChange={(e) => setVd(e.target.value)} /></label>
          <label className="pv-fld">Number of exchanges<input inputMode="numeric" value={nEx} onChange={(e) => setNEx(e.target.value)} /></label>
        </div>
        {Number.isFinite(c1) && Number.isFinite(V1) ? (
          <div className="sq-out">
            <div><span>{fmt(c2, 3)}</span> mg/mL after</div>
            <div><span>{fmt(c1 * V1 * R, 2)}</span> mg protein left</div>
            <div><span>{left < 0.001 ? left.toExponential(1) : fmt(left * 100, 2) + "%"}</span> of the old buffer components left</div>
          </div>
        ) : <p className="pv-small">Enter the stock concentration in "Concentration from absorbance" and the sample volume.</p>}
        <p className="pv-small">Small molecules re-equilibrate at each exchange: the fraction left is (sample ÷ (sample + dialysate))^exchanges. Sample volume often grows a little during dialysis, so enter the volume after if you measured it. The same formula works for concentrators (enter the smaller volume after).</p>
      </section>

      <section className="pv-card">
        <p className="pv-lbl">Size-exclusion elution volume</p>
        <p className="pv-small">Enter the volumes you measured for your column. The standards you fill in are stored in this browser. At least two standards are needed.</p>
        <div className="pv-row pv-end">
          <label className="pv-fld sq-s">Void volume Vo (mL)<input inputMode="decimal" value={vo} onChange={(e) => setVo(e.target.value)} /></label>
          <label className="pv-fld sq-s">Total volume Vt (mL)<input inputMode="decimal" value={vt} onChange={(e) => setVt(e.target.value)} /></label>
        </div>
        <div className="sq-stds">{STDS.map(([n, mw], i) => <label key={n} className="pv-fld"><span>{n} · {mw} kDa</span><input inputMode="decimal" placeholder="Ve (mL)" value={ves[i]} onChange={(e) => setVes((v) => v.map((x, j) => (j === i ? e.target.value : x)))} /></label>)}</div>
        {fit ? (<>
          <p className="pv-small">Fit: Kav = {fit.a.toFixed(3)} {fit.b < 0 ? "−" : "+"} {Math.abs(fit.b).toFixed(3)} × log10(MW), R² = {fit.r2.toFixed(3)} from {fit.n} standards.</p>
          <table className="sq-table"><thead><tr><th>Species</th><th>MW (kDa)</th><th>Expected Ve (mL)</th></tr></thead><tbody>
            {[1, 2, 3, 4].map((k) => <tr key={k}><td>{["Monomer", "Dimer", "Trimer", "Tetramer"][k - 1]}</td><td>{fmt((a.mw * k) / 1000, 1)}</td><td>{fmt(fit.ve((a.mw * k) / 1000), 2)}</td></tr>)}
          </tbody></table>
          <div className="pv-row pv-end"><label className="pv-fld sq-s">Measured peak Ve (mL)<input inputMode="decimal" value={meas} onChange={(e) => setMeas(e.target.value)} /></label>
            {Number.isFinite(num(meas)) && <p className="pv-small">Apparent MW <b>{fmt(fit.mw(num(meas)), 1)} kDa</b>, which is {fmt(fit.mw(num(meas)) / (a.mw / 1000), 2)}× the monomer.</p>}</div>
          <p className="pv-small">Elution depends on shape as well as mass, so extended or disordered proteins appear larger than their MW and sticky ones appear smaller.</p>
        </>) : <p className="pv-small">Fill in Vo, Vt and at least two standards to get predictions.</p>}
      </section>

      <section className="pv-card">
        <p className="pv-lbl">SDS-PAGE migration (schematic)</p>
        <div className="pv-row">{Object.keys(GELS).map((g) => <button key={g} className={`pv-chip${gel === g ? " on" : ""}`} onClick={() => setGel(g)}>{g === "4-20%" ? "4–20% gradient" : g}</button>)}</div>
        <svg viewBox={`0 0 ${GW} ${GH}`} className="sq-gel" role="img" aria-label="Predicted band positions on an SDS-PAGE gel">
          <rect x="50" y={top - 8} width={GW - 60} height={bot - top + 16} rx="6" fill="#EEF2F6" stroke="#cfd6de" />
          <text x="80" y="18" fontSize="10" textAnchor="middle" fill="#666">Ladder</text>
          {LADDER.filter(inRange).map((m) => <g key={m}><rect x="58" y={Yg(m) - 2} width="44" height="4" fill="#9AA3AF" /><text x="46" y={Yg(m) + 4} fontSize="10" textAnchor="end" fill="#555">{m}</text></g>)}
          {lanes.map((l, i) => { const x = 120 + i * 70; const ok = inRange(l.mw); return (
            <g key={l.name}><text x={x + 22} y="18" fontSize="10" textAnchor="middle" fill="#666">{l.name}</text>
              {l.mw > 0 && <rect x={x} y={Math.max(top, Math.min(bot, Yg(l.mw))) - 3} width="44" height="6" rx="2" fill="#17181A" opacity={ok ? 0.85 : 0.3} />}
              <text x={x + 22} y={bot + 16} fontSize="10" textAnchor="middle" fill="#17181A">{fmt(l.mw, 1)} kDa</text></g>); })}
        </svg>
        <p className="pv-small">Bands are placed by log(MW) between the gel's resolving limits ({GELS[gel][0]}–{GELS[gel][1]} kDa for {gel === "4-20%" ? "a 4–20% gradient" : gel}); a faded band is outside that range. Actual position varies by about 10% with charge, glycosylation, and the gel system. A disulfide-bonded protein runs faster without reducing agent.</p>
      </section>
    </>
  );
}
