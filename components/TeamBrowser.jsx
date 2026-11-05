"use client";
import { useEffect, useRef, useState } from "react";

const TABS = [
  { id: "current", label: "Current", empty: "Group members will be introduced here soon." },
  { id: "alumni", label: "Alumni", empty: "Alumni will be listed here." },
  { id: "collaborator", label: "Collaborators", empty: "Collaborators will be listed here." },
];
const txt = (v) => (!v ? "" : typeof v === "string" ? v : v.en || "");

const Icon = ({ k }) => {
  const p = {
    linkedin: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM10 9.5h3.8v1.6h.06c.53-1 1.84-2 3.8-2 4.06 0 4.8 2.57 4.8 5.9V21h-4v-5.1c0-1.22-.02-2.78-1.8-2.78-1.8 0-2.07 1.3-2.07 2.69V21h-4z",
    facebook: "M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.8 2 14.8 2 12.5 2 11 3.4 11 5.9v2.6H8.5V12H11v10h3V12h2.5l.5-3.5z",
    orcid: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8.2 17H6.6V8.4h1.6zm-.8-9.7a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9zM10 8.4h3.4c3 0 4.4 1.7 4.4 4.3 0 2.4-1.6 4.3-4.4 4.3H10zm1.6 7.2h1.7c2 0 2.8-1.2 2.8-2.9 0-1.4-.7-2.8-2.8-2.8h-1.7z",
    email: "M3 5h18v14H3zm2 2v.5l7 5 7-5V7zm14 3l-7 5-7-5v7h14z",
  }[k] || "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z";
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={p} fill="currentColor" /></svg>;
};

export default function TeamBrowser({ people, base = "" }) {
  const [tab, setTab] = useState("current");
  const [open, setOpen] = useState(null); // person id
  const closeRef = useRef(null);
  const lastFocus = useRef(null);

  const list = people
    .filter((m) => (tab === "current" ? m.group === "pi" || m.group === "current" : m.group === tab))
    .sort((a, b) => (a.group === "pi" ? -1 : 0) - (b.group === "pi" ? -1 : 0));
  const idx = list.findIndex((m) => m.id === open);
  const cur = idx >= 0 ? list[idx] : null;

  const go = (d) => list.length && setOpen(list[(idx + d + list.length) % list.length].id);
  const close = () => { setOpen(null); lastFocus.current?.focus?.(); };

  useEffect(() => {
    if (!cur) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", key); };
  });

  const t = TABS.find((x) => x.id === tab);
  const Row = ({ title, items }) =>
    items?.length ? (
      <section className="mm-sec">
        <h4>{title}</h4>
        <ul>{items.map((e, i) => <li key={i}><span>{e.years}</span><p>{e.text}</p></li>)}</ul>
      </section>
    ) : null;

  return (
    <>
      <div className="tabbar-wrap">
        <div className="tabbar" role="tablist" aria-label="Member groups">
          {TABS.map((x) => (
            <button key={x.id} role="tab" aria-selected={tab === x.id} className={tab === x.id ? "on" : ""} onClick={() => { setTab(x.id); setOpen(null); }}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container">
        {list.length === 0 ? (
          <p className="muted team-empty">{t.empty}</p>
        ) : (
          <ul className="pcards">
            {list.map((m) => (
              <li key={m.id}>
                <button className="pcard" onClick={(e) => { lastFocus.current = e.currentTarget; setOpen(m.id); }} aria-label={`Open profile: ${txt(m.name)}`}>
                  <span className="pphoto">
                    {m.photo ? <img src={base + m.photo} alt="" loading="lazy" /> : <b>{txt(m.name)[0]}</b>}
                  </span>
                  <span className="pname">{txt(m.name)}</span>
                  <span className="prole">{txt(m.role)}</span>
                  {m.now && <span className="pnow">{txt(m.now)}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cur && (
        <div className="mm-back" onClick={close}>
          <div className="mm" role="dialog" aria-modal="true" aria-label={txt(cur.name)} onClick={(e) => e.stopPropagation()}>
            <button ref={closeRef} className="mm-x" onClick={close} aria-label="Close">×</button>
            <div className="mm-photo">
              {cur.photo ? <img src={base + cur.photo} alt={txt(cur.name)} /> : <b>{txt(cur.name)[0]}</b>}
            </div>
            <div className="mm-body">
              <h3>{txt(cur.name)}</h3>
              <p className="mm-role">{txt(cur.role)}</p>
              {cur.position && <p className="mm-pos">{txt(cur.position)}</p>}
              {cur.now && <p className="mm-now"><span>Now</span>{txt(cur.now)}</p>}
              {cur.focus?.length > 0 && (
                <div className="mm-focus">
                  <h4>{cur.focus_label || "Focused projects"}</h4>
                  <ul>{[].concat(cur.focus).map((f, i) => <li key={i}>{txt(f)}</li>)}</ul>
                </div>
              )}
              {cur.bio && <p className="mm-bio">{txt(cur.bio)}</p>}
              <Row title="Career" items={cur.career} />
              <Row title="Education" items={cur.education} />
              {cur.links && (
                <p className="mm-links">
                  {Object.entries(cur.links).filter(([, v]) => v).map(([k, v]) => (
                    <a key={k} href={k === "email" ? `mailto:${v}` : v} target="_blank" rel="noreferrer" aria-label={k} title={k}><Icon k={k} /></a>
                  ))}
                </p>
              )}
            </div>
            {list.length > 1 && (
              <div className="mm-nav">
                <button onClick={() => go(-1)} aria-label="Previous">‹</button>
                <button onClick={() => go(1)} aria-label="Next">›</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
