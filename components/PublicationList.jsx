"use client";
import { useMemo, useState } from "react";

const TYPE_LABEL = {
  preprint: { en: "preprint", ko: "프리프린트" },
  conference: { en: "conference", ko: "학회 발표" },
};

function Bi({ en, ko }) {
  return (
    <>
      <span className="en-only">{en}</span>
      <span className="ko-only">{ko}</span>
    </>
  );
}

export default function PublicationList({ pubs, topics }) {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const used = useMemo(() => {
    const ids = new Set(pubs.flatMap((p) => p.topics));
    return topics.filter((t) => ids.has(t.id));
  }, [pubs, topics]);

  const topicMap = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return pubs.filter((p) => {
      if (filter === "Selected" && !p.selected) return false;
      if (filter !== "All" && filter !== "Selected" && !p.topics.includes(filter)) return false;
      if (needle && !`${p.title} ${p.authors} ${p.journal} ${p.year}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [pubs, filter, q]);

  const byYear = useMemo(() => {
    const m = new Map();
    for (const p of rows) (m.get(p.year) ?? m.set(p.year, []).get(p.year)).push(p);
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [rows]);

  const chips = [
    { id: "All", en: "All", ko: "전체" },
    { id: "Selected", en: "Selected", ko: "주요 논문" },
    ...used,
  ];

  return (
    <>
      <div className="pub-toolbar">
        <div className="container pub-toolbar-row">
          <div className="chips" role="group" aria-label="Filter by topic">
            {chips.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                <Bi en={c.en} ko={c.ko} />
              </button>
            ))}
          </div>
          <label className="search-field">
            <span className="sr-only">Search publications</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, author, journal · 제목, 저자, 저널"
            />
          </label>
        </div>
      </div>

      <div className="container pub-body">
        {byYear.length === 0 && (
          <p className="muted"><Bi en="No publications match." ko="일치하는 논문이 없습니다." /></p>
        )}
        {byYear.map(([year, list]) => (
          <section key={year} className="pub-year">
            <h2 className="pub-year-label">{year || "—"}</h2>
            <div className="pub-list">
              {list.map((p) => (
                <article key={`${p.doi}${p.title}`} className="pub-entry">
                  <div className="pub-venue">
                    {p.journal}
                    {TYPE_LABEL[p.type] && (
                      <> (<Bi en={TYPE_LABEL[p.type].en} ko={TYPE_LABEL[p.type].ko} />)</>
                    )}
                  </div>
                  <h3 className="pub-title">
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                  </h3>
                  <p className="pub-authors">{p.authors}</p>
                  <div className="pub-meta">
                    {p.selected && <span className="pub-flag"><Bi en="Selected" ko="주요 논문" /></span>}
                    {p.topics.map((id) => topicMap[id] && (
                      <span key={id} className="tag"><Bi en={topicMap[id].en} ko={topicMap[id].ko} /></span>
                    ))}
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
