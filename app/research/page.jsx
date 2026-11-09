import Link from "next/link";
import { ArtDefs, Q3Fig } from "../../components/ResearchArt";

export const metadata = { title: "Research" };

const NEURO = {
  id: "neuro", n: 2, scale: "Cells to circuits", color: "purple", Fig: Q3Fig,
  q: "Can neurogenesis and neuroprotection be driven together in Alzheimer's disease?",
  p: "In models of Alzheimer's disease we search for compounds that promote neurogenesis and protect neurons. Two routes are followed: GPCR agonists with defined signaling bias, and de novo designed proteins, which we call Molecular Shield.",
  fam: ["GPCR agonists", "Molecular Shield", "Human NPC models"],
};

const PROJECTS = ["TRIB2 binder discovery", "GSPT1 molecular glue degraders", "E3 ligase expansion", "ATTEC design"];

const ENGINE = [
  { k: "ai", t: "AI-driven drug discovery", items: ["Molecular dynamics", "Structure-based virtual screening", "Ligand-based virtual screening", "ADMET-AI", "Co-folding"] },
  { k: "bio", t: "Biophysics", items: ["Bio-layer interferometry (BLI)", "Thermal shift assay (TSA)", "Fluorescence polarization (FP)"] },
  { k: "str", t: "Structure", items: ["X-ray crystallography", "Cryo-EM"] },
  { k: "cell", t: "Cell biology", items: ["HiBiT", "NanoBRET", "Viability", "Target degradation"] },
];

export default function Research() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <>
      <ArtDefs />
      <header className="page-head">
        <div className="container">
          <p className="eyebrow">Research</p>
          <h1 className="h1">Research</h1>
          <p className="body-lg rs-lede">We work on drug discovery for hard targets and neurological disease, with computation, biophysics, structure and cell biology in one loop.</p>
        </div>
      </header>

      <div className="container">
        <section id="glue" className="rs-part1">
          <p className="rs-badge"><b>1</b>Atoms, in silico and cells</p>
          <h2 className="h2 rs-qh">Can in silico resolution discern active from inactive compounds to break the boundaries of molecular glues?</h2>
          <p className="body-lg rs-lede">Brute-force docking only asks whether a compound binds, which is the wrong question for finding active compounds. By raising the resolution of in silico evaluation, we discriminate active from inactive compounds and navigate unexplored chemical space, unchaining CRBN molecular glues from conventional glutarimide scaffolds. Moving beyond serendipitous screening, this biophysical and structural resolution drives E3 ligase expansion and enables true target-first, rational MGD discovery.</p>
          <figure className="rs-fig"><img src={base + "/images/research/part1.webp"} width="2048" height="1144" loading="lazy" alt="Three-panel scheme. Left: brute-force docking cannot separate active from inactive compounds, while high-resolution in silico scoring separates them. Middle: expansion from traditional glutarimide chemical space to non-glutarimide scaffolds by AI-driven design and virtual screening. Right: a CRBN, DDB1, Cullin 4 and Rbx1 ternary complex with GSPT1 leading to ubiquitination and proteasomal degradation." /></figure>
          <div className="rs-proj"><span>Projects</span>{PROJECTS.map((x) => <b key={x}>{x}</b>)}</div>
        </section>

        <section id={NEURO.id} className={`rs-q rs-${NEURO.color}`}>
          <div className="rs-qtext">
            <p className="rs-badge"><b>{NEURO.n}</b>{NEURO.scale}</p>
            <h2 className="h2">{NEURO.q}</h2>
            <p className="body-lg">{NEURO.p}</p>
            <div className="rs-fam">{NEURO.fam.map((f) => <span key={f}>{f}</span>)}</div>
          </div>
          <figure className="rs-card"><NEURO.Fig /></figure>
        </section>

        <section id="platform" className="rs-plat">
          <p className="eyebrow">Core platform</p>
          <h2 className="h2">Four groups of methods, used as one loop</h2>
          <div className="rs-loop">
            {ENGINE.map((e, i) => (
              <div key={e.k} className={`rs-step rs-s-${e.k}`}>
                <span className="rs-num">{i + 1}</span>
                <h3>{e.t}</h3>
                <ul>{e.items.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
          <svg className="rs-return" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true"><path d="M960 4 V26 H40 V8" fill="none" stroke="#F39800" strokeWidth="2.6" strokeDasharray="2 7" strokeLinecap="round" /><path d="M33 15 L40 6 L47 15" fill="none" stroke="#F39800" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <p className="rs-fb">Results from each step are fed back into the models for the next round of design.</p>
        </section>

        <section className="rs-tools">
          <div><p className="eyebrow">Try it</p><h2 className="h2">Parts of the platform run in your browser</h2><p className="body-lg">Small tools from our workflow are open to use, with no upload to any server.</p></div>
          <div className="rs-tl">
            <Link href="/tools/mol-editor/">Molecule editor</Link><Link href="/tools/library/">Library map and SAR table</Link><Link href="/tools/plate-planner/">Plate planner</Link><Link href="/tools/">All tools</Link>
          </div>
        </section>
      </div>
    </>
  );
}
