import CarpetHero from "../../components/CarpetHero";

export const metadata = {
  title: "Philosophy",
  description: "The aLaDDIN philosophy: a magic carpet ride across chemical space.",
};

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const steps = [
  {
    n: "01",
    label: "Decoding Nature's Grammar",
    big: <>Protein interactions are a <em>language</em> that evolution has refined for billions of years.</>,
    body:
      "Shape, charge and motion at a protein interface follow a grammar. We read that grammar first, then borrow it, which is how closed and flexible surfaces of undruggable targets begin to open.",
    bg: "bg-map.webp",
    side: "left",
  },
  {
    n: "02",
    label: "Voyagers in Chemical Space",
    big: <>Chemical space is full of noise. Our work is to tell <em>active</em> from <em>inactive</em>.</>,
    body:
      "We do not tie ourselves to one algorithm. Computational chemistry, generative models, interface geometry, molecular dynamics and structural biology serve a single aim, a high-resolution discrimination of what truly works.",
    bg: "bg-protein.webp",
    side: "right",
  },
  {
    n: "03",
    label: "Grounded in Biological Reality",
    big: <>Every voyage ends at the <em>bench</em>, in real biology.</>,
    body:
      "Hypotheses from the computer are tested by biophysical binding on recombinant protein, then by function in cell-based models.",
    flow: ["In silico", "Biophysics", "Cell models", "Biological function"],
    bg: "bg-landing.webp",
    side: "land",
  },
];

export default function Philosophy() {
  return (
    <>
      <CarpetHero />

      <div className="pv">
        {steps.map((s) => (
          <section key={s.n} className={"pv-sec" + (s.bg ? " has-bg bg-" + s.side : "")}>
            {s.bg && (
              <div
                className="pv-bg"
                aria-hidden="true"
                style={{ backgroundImage: `url(${base}/images/philosophy/${s.bg})` }}
              />
            )}
            <div className="container pv-in">
              <p className="pv-label"><span>{s.n}</span>{s.label}</p>
              <h2 className="pv-big">{s.big}</h2>
              <p className="pv-body">{s.body}</p>
              {s.flow && (
                <ol className="pv-flow" aria-label="Verification path">
                  {s.flow.map((f) => <li key={f}>{f}</li>)}
                </ol>
              )}
            </div>
          </section>
        ))}

        <section className="pv-sec pv-joy">
          <div className="container pv-in">
            <p className="pv-label">Why we do it</p>
            <h2 className="pv-big pv-big-joy">
              Research should always be a <em>happy, joyful</em> pursuit of understanding.
            </h2>
            <p className="pv-body">
              Curiosity brought each of us to science. We want the lab to keep it alive.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
