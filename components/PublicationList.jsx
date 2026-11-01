"use client";
import { useMemo, useState } from "react";
import Authors from "./Authors";

// Categories, each numbered on its own (newest = largest number).
const CATS = [
  { id: "papers", label: "Papers & Book chapters", match: (p) => p.type !== "preprint" },
  { id: "preprints", label: "Preprints", match: (p) => p.type === "preprint" },
];
const TYPE_LABEL = { conference: "conference", review: "review", chapter: "book chapter" };

export default function PublicationList({ pubs, topics, piName, patents = [] }) {
  const [cat, setCat] = useState("papers");
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const topicMap = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics]);

  // per-category numbering, independent of filters
  const byCat = useMemo(() => {
    const out = {};
    for (const c of CATS) {
      const list = pubs.filter(c.match).sort((a, b) => (b.year || 0) - (a.year || 0));
      out[c.id] = list.map((p, i) => ({ ...p, no: list.length - i }));
    }
    return out;
  }, [pubs]);

  const sortedPatents = useMemo(() => {
    const list = [...patents].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    return list.map((p, i) => ({ ...p, no: list.length - i }));
  }, [patents]);

  const tabs = [
    { id: "papers", label: CATS[0].label, n: byCat.papers.length },
    ...(sortedPatents.length ? [{ id: "patents", label: "Patents", n: sortedPatents.length }] : []),
    ...(byCat.preprints.length ? [{ id: "preprints", label: "Preprints", n: byCat.preprints.length }] : []),
  ];

  const current = cat === "patents" ? [] : byCat[cat] ?? [];

  const used = useMemo(() => {
    const ids = new Set(current.flatMap((p) => p.topics));
    return topics.filter((t) => ids.has(t.id));
  }, [current, topics]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return current.filter((p) => {
      if (filter === "Selected" && !p.selected) return false;
      if (filter === "chapter") { if (p.type !== "chapter") return false; }
      else if (filter !== "All" && filter !== "Selected" && !p.topics.includes(filter)) return false;
      if (needle && !`${p.title} ${p.authors} ${p.journal} ${p.year}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [current, filter, q]);

  const byYear = useMemo(() => {
    const m = new Map();
    for (const p of rows) (m.get(p.year) ?? m.set(p.year, []).get(p.year)).push(p);
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [rows]);

  const chips = [
    { id: "All", label: "All" },
    ...(cat === "papers" ? [{ id: "Selected", label: "Selected" }] : []),
    ...used.map((t) => ({ id: t.id, label: t.abbr, title: t.en })),
    ...(cat === "papers" && current.some((p) => p.type === "chapter") ? [{ id: "chapter", label: "Book chapter" }] : []),
  ];

  const switchCat = (id) => { setCat(id); setFilter("All"); setQ(""); };
  const anyMark = current.some((p) => p.mark && (p.mark.includes("*") || p.mark.includes("#")));

  return (
    <>
      <div className="pub-toolbar">
        {tabs.length > 1 && (
          <div className="container cat-row" role="tablist" aria-label="Category">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" className="cat-tab" aria-selected={cat === t.id} onClick={() => switchCat(t.id)}>
                {t.label} <span className="cat-n">{t.n}</span>
              </button>
            ))}
          </div>
        )}
        {cat !== "patents" && (
          <>
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
          </>
        )}
      </div>

      <div className="container pub-body">
        {cat === "patents" ? (
          <div className="pub-year" style={{ gridTemplateColumns: "1fr" }}>
            <div className="pub-list">
              {sortedPatents.map((p) => (
                <article key={p.number || p.title} className="pub-entry numbered">
                  <span className="pub-no">{p.no}</span>
                  <div className="pub-body-col">
                    <div className="pub-venue">
                      {[p.country, p.number, p.status, p.year].filter(Boolean).join(" · ")}
                    </div>
                    <h3 className="pub-title">
                      {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                    </h3>
                    <p className="pub-authors">
                      <Authors text={p.inventors || ""} mark="" piName={piName} />
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <>
            {anyMark && (
              <p className="pub-note"><b className="pi-mark">*</b> Corresponding author &nbsp; <b className="pi-mark">#</b> Co-first author</p>
            )}
            {byYear.length === 0 && <p className="muted">No publications match.</p>}
            {byYear.map(([year, list]) => (
              <section key={year} className="pub-year">
                <h2 className="pub-year-label">{year || "-"}</h2>
                <div className="pub-list">
                  {list.map((p) => (
                    <article key={`${p.doi}${p.title}`} className="pub-entry numbered">
                      <span className="pub-no" aria-label={`${CATS.find((c) => c.id === cat)?.label} ${p.no}`}>{p.no}</span>
                      <div className="pub-body-col">
                        <div className="pub-venue">
                          {p.journal}
                          {TYPE_LABEL[p.type] && <> ({TYPE_LABEL[p.type]})</>}
                          {p.status && <> · <em className="pub-status">{p.status}</em></>}
                        </div>
                        <h3 className="pub-title">
                          {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                        </h3>
                        <p className="pub-authors"><Authors text={p.authors} mark={p.mark} pos={p.piPos} piName={piName} /></p>
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
          </>
        )}
      </div>
    </>
  );
}
