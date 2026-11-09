import Link from "next/link";
import FlowFigure from "../../components/FlowFigure";
import LoopFigure from "../../components/LoopFigure";
import PageBanner from "../../components/PageBanner";
import { ArtDefs } from "../../components/ResearchArt";

export const metadata = {
  title: "Research",
  description: "Discriminating active from inactive compounds in silico, molecular glue discovery, neurogenesis and neuroprotection.",
};

const PROJECTS = ["TRIB2 binder discovery", "GSPT1 molecular glue degraders", "E3 ligase expansion", "ATTEC design"];
const NEURO_CHIPS = ["GPCR agonists", "Nurr1 stabilization", "Molecular Shield", "Human NPC models"];

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
            <figure className="rs-fig"><FlowFigure src={base + "/images/research/part1-v2.webp"} w={2752} h={1536} alt="Three-panel scheme. Left: brute-force docking cannot separate active from inactive compounds, while high-resolution in silico scoring separates them. Middle: expansion from traditional glutarimide chemical space to non-glutarimide scaffolds by AI-driven design and virtual screening. Right: a CRBN, DDB1, Cullin 4 and Rbx1 ternary complex with GSPT1 leading to ubiquitination and proteasomal degradation." /></figure>
            <div className="rs-proj"><span>Projects</span>{PROJECTS.map((x) => <b key={x}>{x}</b>)}</div>
          </div>
        </section>

        <section className="pv-sec rs-sec has-bg bg-right">
          <div className="pv-bg" aria-hidden="true" style={bg("bg-neuro.webp")} />
          <div className="container pv-in">
            <p className="pv-label"><span>02</span>Alzheimer&apos;s disease</p>
            <h2 className="pv-big rs-big">Can <em>neurogenesis</em> and <em>neuroprotection</em> be driven together?</h2>
            <p className="pv-body">Nurr1 is a transcription factor with a disordered, hard-to-drug surface, and it is lost in disease through E3 ligase-mediated degradation. Conventional ligands do not stop this loss. We ask whether GPCR signaling can stabilize Nurr1 by blocking degradation, so that neurogenesis and neuroprotection are driven together.</p><p className="pv-body">Alongside GPCR agonists with defined signaling bias, we design proteins de novo, which we call Molecular Shield.</p>
            <figure className="rs-card"><img src={base + "/images/research/neuro-v1.webp"} alt="Nurr1 is lost by E3 ligase-mediated degradation; GPCR signaling stabilizes Nurr1 and adds neuroprotection beyond a conventional agonist" width={2048} height={1028} style={{ width: "100%", height: "auto", display: "block" }} loading="lazy" /></figure>
            <div className="rs-proj"><span>Focus</span>{NEURO_CHIPS.map((x) => <b key={x}>{x}</b>)}</div>
          </div>
        </section>

        <section className="pv-sec rs-sec rs-plat has-bg bg-left">
          <div className="pv-bg" aria-hidden="true" style={bg("bg-loop.webp")} />
          <div className="container pv-in">
            <p className="pv-label"><span>03</span>Core platform</p>
            <h2 className="pv-big rs-big">Four groups of methods, used as <em>one loop</em>.</h2>
            
            <LoopFigure src={base + "/images/research/platform-v1.webp"} w={1262} h={282} alt="Four groups of methods in order: AI-driven drug discovery, biophysics, structure and cell biology, with results fed back into the models." />
            <ul className="rs-sr">{ENGINE.map((e) => <li key={e.k}>{e.t}: {e.items.join(", ")}</li>)}</ul>
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
