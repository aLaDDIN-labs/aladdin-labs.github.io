import { L, T } from "../../components/L";
import { getResearch, getPublications } from "../../lib/data";

export const metadata = { title: "Research" };

export default function Research() {
  const { areas } = getResearch();
  const pubs = getPublications();
  const byDoi = Object.fromEntries(pubs.filter((p) => p.doi).map((p) => [p.doi, p]));
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <>
      <header className="page-head">
        <div className="container">
          <p className="eyebrow"><L en="Research" ko="연구" /></p>
          <h1 className="h1"><L en="Research" ko="연구" /></h1>
          <nav className="anchor-chips" aria-label="Research areas">
            {areas.map((a) => (
              <a key={a.id} className="chip" href={`#${a.id}`}><T v={a.title} /></a>
            ))}
          </nav>
        </div>
      </header>

      <div className="container">
        {areas.map((a) => {
          const keyPapers = (a.key_papers ?? []).map((d) => byDoi[d.toLowerCase()]).filter(Boolean);
          return (
            <section key={a.id} id={a.id} className="research-block">
              <div>
                <h2 className="h2"><T v={a.title} /></h2>
                <p className="body-lg"><T v={a.summary} /></p>
                {keyPapers.length > 0 && (
                  <>
                    <h3 className="eyebrow" style={{ marginTop: 28 }}><L en="Key papers" ko="대표 연구" /></h3>
                    <ul className="key-papers">
                      {keyPapers.map((p) => (
                        <li key={p.doi}>
                          <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
                          <span className="muted small">{p.authors.split(",")[0]} et al., {p.journal}, {p.year}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <figure className="figure">
                {a.figure ? (
                  <>
                    <img src={base + a.figure} alt="" loading="lazy" />
                    {(a.figure_caption?.en || a.figure_caption?.ko) && (
                      <figcaption><T v={a.figure_caption} /></figcaption>
                    )}
                  </>
                ) : (
                  <div className="figure-ph" aria-hidden="true"><span>Figure</span></div>
                )}
              </figure>
            </section>
          );
        })}
      </div>
    </>
  );
}
