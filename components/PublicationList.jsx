"use client";
import { useMemo, useState } from "react";
import Authors from "./Authors";

const TYPE_LABEL = { preprint: "preprint", conference: "conference" };

export default function PublicationList({ pubs, topics, piName }) {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const used = useMemo(() => {
    const ids = new Set(pubs.flatMap((p) => p.topics));
    return topics.filter((t) => ids.has(t.id));
  }, [pubs, topics]);

  const topicMap = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics]);

  // Fixed numbering: newest = largest number (independent of filters)
  const numbered = useMemo(() => {
    const sorted = [...pubs].sort((a, b) => (b.year || 0) - (a.year || 0));
    return sorted.map((p, i) => ({ ...p, no: sorted.length - i }));
  }, [pubs]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return numbered.filter((p) => {
      if (filter === "Selected" && !p.selected) return false;
      if (filter !== "All" && filter !== "Selected" && !p.topics.includes(filter)) return false;
      if (needle && !`${p.title} ${p.authors} ${p.journal} ${p.year}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [numbered, filter, q]);

  const byYear = useMemo(() => {
    const m = new Map();
    for (const p of rows) (m.get(p.year) ?? m.set(p.year, []).get(p.year)).push(p);
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [rows]);

  const chips = [
    { id: "All", label: "All" },
    { id: "Selected", label: "Selected" },
    ...used.map((t) => ({ id: t.id, label: t.abbr, title: t.en })),
  ];

  return (
    <>
      <div className="pub-toolbar">
        <div className="container pub-toolbar-row">
          <div className="chips" role="group" aria-label="Filter by topic">
            {chips.map((c) => (
              <button key={c.id} type="button" className="chip" title={c.title} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span className="sr-only">Search publications</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, author, journal" />
          </label>
        </div>
        {used.length > 0 && (
          <div className="container tag-legend">
            {used.map((t) => (<span key={t.id}><b>{t.abbr}</b> {t.en}</span>))}
          </div>
        )}
      </div>

      <div className="container pub-body">
        {numbered.some((p) => p.mark.includes("*") || p.mark.includes("#")) && (
          <p className="pub-note"><b className="pi-mark">*</b> Corresponding author &nbsp; <b className="pi-mark">#</b> Co-first author</p>
        )}
        {byYear.length === 0 && <p className="muted">No publications match.</p>}
        {byYear.map(([year, list]) => (
          <section key={year} className="pub-year">
            <h2 className="pub-year-label">{year || "-"}</h2>
            <div className="pub-list">
              {list.map((p) => (
                <article key={`${p.doi}${p.title}`} className="pub-entry numbered">
                  <span className="pub-no" aria-label={`Publication ${p.no}`}>{p.no}</span>
                  <div className="pub-body-col">
                  <div className="pub-venue">
                    {p.journal}
                    {TYPE_LABEL[p.type] && <> ({TYPE_LABEL[p.type]})</>}
                  </div>
                  <h3 className="pub-title">
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                  </h3>
                  <p className="pub-authors"><Authors text={p.authors} mark={p.mark} piName={piName} /></p>
                  <div className="pub-meta">
                    {p.selected && <span className="pub-flag">Selected</span>}
                    {p.topics.map((id) => topicMap[id] && (
                      <span key={id} className="tag tag-abbr" title={topicMap[id].en}>{topicMap[id].abbr}</span>
                    ))}
                  </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
