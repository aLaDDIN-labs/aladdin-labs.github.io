import Link from "next/link";
import FlowFigure from "../../components/FlowFigure";
import PageBanner from "../../components/PageBanner";
import { ArtDefs, Q3Fig } from "../../components/ResearchArt";

export const metadata = {
  title: "Research",
  description: "Discriminating active from inactive compounds in silico, molecular glue discovery, neurogenesis and neuroprotection.",
};

const PROJECTS = ["TRIB2 binder discovery", "GSPT1 molecular glue degraders", "E3 ligase expansion", "ATTEC design"];
const NEURO_CHIPS = ["GPCR agonists", "Molecular Shield", "Human NPC models"];

const ENGINE = [
  { k: "ai", t: "AI-driven drug discovery", items: ["Molecular dynamics", "Structure-based virtual screening", "Ligand-based virtual screening", "ADMET-AI", "Co-folding"] },
  { k: "bio", t: "Biophysics", items: ["Bio-layer interferometry (BLI)", "Thermal shift assay (TSA)", "Fluorescence polarization (FP)"] },
  { k: "str", t: "Structure", items: ["X-ray crystallography", "Cryo-EM"] },
  { k: "cell", t: "Cell biology", items: ["HiBiT", "NanoBRET", "Viability", "Target degradation"] },
];

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const bg = (f) => ({ backgroundImage: `url(${base}/images/research/${f})` });

export default function Research() {
  return (
    <>
      <ArtDefs />
      <PageBanner src="/images/banners/research.webp" alt="Sketch of researchers working with computation, structures, assays and neural circuits" eyebrow="Research" light="Discovery at" wordmark focus="-50%" />

      <div className="rs-pv">
        <section className="pv-sec rs-sec has-bg bg-left">
          <div className="pv-bg" aria-hidden="true" style={bg("bg-glue.webp")} />
          <div className="container pv-in">
            <p className="pv-label"><span>01</span>Molecular glues</p>
            <h2 className="pv-big rs-big">Can in silico resolution discern <em>active</em> from <em>inactive</em> compounds to break the boundaries of molecular glues?</h2>
            <p className="pv-body">Brute-force docking only asks whether a compound binds, which is the wrong question for finding active compounds. By raising the resolution of in silico evaluation, we discriminate active from inactive compounds and navigate unexplored chemical space, unchaining CRBN molecular glues from conventional glutarimide scaffolds.</p>
            <p className="pv-body rs-p2">Moving beyond serendipitous screening, this biophysical and structural resolution drives E3 ligase expansion and enables true target-first, rational MGD discovery.</p>
            <figure className="rs-fig"><FlowFigure src={base + "/images/research/part1.webp"} w={2752} h={1536} alt="Three-panel scheme. Left: brute-force docking cannot separate active from inactive compounds, while high-resolution in silico scoring separates them. Middle: expansion from traditional glutarimide chemical space to non-glutarimide scaffolds by AI-driven design and virtual screening. Right: a CRBN, DDB1, Cullin 4 and Rbx1 ternary complex with GSPT1 leading to ubiquitination and proteasomal degradation." /></figure>
            <div className="rs-proj"><span>Projects</span>{PROJECTS.map((x) => <b key={x}>{x}</b>)}</div>
          </div>
        </section>

        <section className="pv-sec rs-sec has-bg bg-right">
          <div className="pv-bg" aria-hidden="true" style={bg("bg-neuro.webp")} />
          <div className="container pv-in">
            <p className="pv-label"><span>02</span>Alzheimer&apos;s disease</p>
            <h2 className="pv-big rs-big">Can <em>neurogenesis</em> and <em>neuroprotection</em> be driven together?</h2>
            <p className="pv-body">In models of Alzheimer&apos;s disease we search for compounds that promote neurogenesis and protect neurons. Two routes are followed: GPCR agonists with defined signaling bias, and de novo designed proteins, which we call Molecular Shield.</p>
            <figure className="rs-card"><Q3Fig /></figure>
            <div className="rs-proj"><span>Focus</span>{NEURO_CHIPS.map((x) => <b key={x}>{x}</b>)}</div>
          </div>
        </section>

        <section className="pv-sec rs-sec has-bg bg-left">
          <div className="pv-bg" aria-hidden="true" style={bg("bg-loop.webp")} />
          <div className="container pv-in">
            <p className="pv-label"><span>03</span>Core platform</p>
            <h2 className="pv-big rs-big">Four groups of methods, used as <em>one loop</em>.</h2>
            <p className="pv-body">Results from each step are fed back into the models for the next round of design.</p>
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
          </div>
        </section>

        <section className="pv-sec pv-joy rs-sec">
          <div className="container pv-in">
            <p className="pv-label">Try it</p>
            <h2 className="pv-big rs-big">Parts of the platform run in your <em>browser</em>.</h2>
            <p className="pv-body">Small tools from our workflow are open to use, with no upload to any server.</p>
            <div className="rs-tl">
              <Link href="/tools/mol-editor/">Molecule editor</Link><Link href="/tools/library/">Library map and SAR table</Link><Link href="/tools/plate-planner/">Plate planner</Link><Link href="/tools/">All tools</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
