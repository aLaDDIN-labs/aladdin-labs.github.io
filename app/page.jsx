import Link from "next/link";
import MoleculeField from "../components/MoleculeField";
import { L, T } from "../components/L";
import { getSite, getResearch, getPublications, getTeam, getNews } from "../lib/data";

export default function Home() {
  const site = getSite();
  const research = getResearch();
  const selected = getPublications().filter((p) => p.selected).slice(0, 4);
  const team = getTeam().filter((m) => m.group === "pi" || m.group === "member");
  const news = getNews().slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <MoleculeField />
        <div className="container hero-inner">
          <p className="eyebrow">{site.name}</p>
          <h1 className="display"><T v={site.tagline} /></h1>
          <p className="lede"><T v={site.intro} /></p>
          <div className="hero-cta">
            <Link className="btn btn-primary" href="/research/"><L en="Our research" ko="연구 소개" /></Link>
            <Link className="btn btn-ghost" href="/publications/"><L en="Publications" ko="논문" /></Link>
          </div>
        </div>
      </section>

      {/* Research areas */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow"><L en="Research" ko="연구" /></p>
            <h2 className="h2"><L en="What we work on" ko="연구 분야" /></h2>
          </div>
          <div className="card-grid">
            {research.areas.map((a) => (
              <Link key={a.id} href={`/research/#${a.id}`} className="card card-link">
                <h3 className="h3"><T v={a.title} /></h3>
                <p className="muted"><T v={a.summary} /></p>
                <span className="more"><L en="Learn more" ko="자세히" /> →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Selected publications */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow"><L en="Publications" ko="논문" /></p>
            <h2 className="h2"><L en="Selected papers" ko="주요 논문" /></h2>
          </div>
          {selected.length === 0 ? (
            <p className="muted">
              <L
                en="Mark papers as selected in data/publication-meta.yaml to feature them here."
                ko="data/publication-meta.yaml에서 selected를 지정하면 여기에 표시됩니다."
              />
            </p>
          ) : (
            <div className="pub-list">
              {selected.map((p) => (
                <article key={p.doi || p.title} className="pub-entry">
                  <div className="pub-venue">{p.journal} · {p.year}</div>
                  <h3 className="pub-title">
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                  </h3>
                  <p className="pub-authors">{p.authors}</p>
                </article>
              ))}
            </div>
          )}
          <p style={{ marginTop: 28 }}>
            <Link className="btn btn-ghost" href="/publications/"><L en="All publications" ko="전체 논문" /></Link>
          </p>
        </div>
      </section>

      {/* Team */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow"><L en="Team" ko="구성원" /></p>
            <h2 className="h2"><L en="People" ko="사람들" /></h2>
          </div>
          <div className="team-strip">
            {team.map((m) => (
              <Link key={m.id} href="/team/" className="person">
                <div className="avatar" aria-hidden="true">
                  {m.photo ? <img src={(process.env.NEXT_PUBLIC_BASE_PATH || "") + m.photo} alt="" /> : <span>{(m.name.en || "?")[0]}</span>}
                </div>
                <strong><T v={m.name} /></strong>
                <span className="muted small"><T v={m.role} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* News + Locations */}
      <section className="section section-alt">
        <div className="container two-col">
          <div>
            <p className="eyebrow"><L en="News" ko="소식" /></p>
            <ul className="news">
              {news.map((n, i) => (
                <li key={i}>
                  <time>{n.date}</time>
                  <span>{n.link ? <a href={n.link}><T v={n.title} /></a> : <T v={n.title} />}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow"><L en="Affiliations" ko="소속" /></p>
            <ul className="plain">
              {site.affiliations.map((a, i) => (<li key={i}><T v={a} /></li>))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
