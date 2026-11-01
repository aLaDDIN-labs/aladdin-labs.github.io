import CarpetHero from "../../components/CarpetHero";

export const metadata = {
  title: "Philosophy",
  description: "The aLaDDIN philosophy: a magic carpet ride across chemical space.",
};

const steps = [
  {
    n: "01",
    title: <>The Infinite Desert of Chemical Space (10<sup>60</sup>)</>,
    body: (
      <p>
        The chemical space available to drug discovery holds more than 10<sup>60</sup> possible molecules, a
        vast desert. Conventional screening crosses it on foot with a static map, and it loses its way at
        undruggable targets whose surfaces are rigid or whose active pockets are missing.
      </p>
    ),
  },
  {
    n: "02",
    title: "Taking Flight: The Magic Carpet Ride",
    body: (
      <>
        <p>
          ALADDIN (A Lab for Drug Discovery in Neurological Disorders) does not walk this terrain. Riding a
          carpet woven from generative AI-driven drug design and long-timescale (microsecond) molecular
          dynamics, we fly over the rugged free-energy barriers of proteins.
        </p>
        <ul className="phil-points">
          <li>
            <h3>Dynamic Navigation</h3>
            <p>
              Instead of a frozen snapshot, we follow the living probability density of protein
              conformations to find binding pockets that were not visible before.
            </p>
          </li>
          <li>
            <h3>Physics-Guided Synthesis</h3>
            <p>
              Beyond random exploration, we decode the physicochemical grammar of atomic interfaces and head
              straight for the most promising chemical coordinates.
            </p>
          </li>
        </ul>
      </>
    ),
  },
  {
    n: "03",
    title: "Landing on Reality: Full-Stack Verification",
    body: (
      <p>
        Every flight ends in rigorous verification. Trajectories designed in silico are proven in the lab with
        recombinant-protein biophysical assays (BLI, FP, TSA) and patient-derived iPSC neuronal models (CETSA,
        synaptic function assays).
      </p>
    ),
  },
];

export default function Philosophy() {
  return (
    <>
      <CarpetHero />

      <div className="container phil-body">
        {steps.map((s) => (
          <section key={s.n} className="phil-step">
            <div className="phil-num">{s.n}</div>
            <div>
              <h2 className="phil-h">{s.title}</h2>
              <div className="phil-text">{s.body}</div>
            </div>
          </section>
        ))}

        <blockquote className="phil-quote">
          We are not a virtual simulator. We fly across uncharted chemical space and turn molecules that once
          looked impossible into <strong>precision tools against human disease</strong>.
        </blockquote>
      </div>
    </>
  );
}
