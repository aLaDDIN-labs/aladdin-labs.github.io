"use client";
import { useEffect, useState } from "react";

const fmt = (d) =>
  d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : "";

// An entry is either one photo (`image`) or an album (`photos: [...]`, optional `cover`).
const norm = (e) => {
  const photos = (e.photos && e.photos.length ? e.photos : e.image ? [e.image] : []).map((p) => (typeof p === "string" ? { src: p } : { src: p.image || p.src, caption: p.caption }));
  return { ...e, photos, cover: e.cover || photos[0]?.src };
};

export default function OutreachGallery({ items, base = "" }) {
  const albums = items.map(norm).filter((a) => a.photos.length);
  const tags = [...new Set(albums.map((a) => a.tag).filter(Boolean))];
  const [tag, setTag] = useState("All");
  const [sel, setSel] = useState(null); // { a: album index in list, p: photo index }
  const list = tag === "All" ? albums : albums.filter((a) => a.tag === tag);
  const album = sel ? list[sel.a] : null;
  const photo = album ? album.photos[sel.p] : null;
  const step = (d) => setSel((s) => ({ a: s.a, p: (s.p + d + list[s.a].photos.length) % list[s.a].photos.length }));

  useEffect(() => {
    if (!album) return;
    document.body.style.overflow = "hidden";
    const key = (e) => {
      if (e.key === "Escape") setSel(null);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", key); };
  });

  if (!albums.length)
    return (
      <div className="container">
        <div className="og-empty">
          <b>Photos coming soon</b>
          Add images to <code>public/images/outreach/</code> and list them in <code>data/outreach.yaml</code>.
        </div>
      </div>
    );

  return (
    <div className="container">
      {tags.length > 0 && (
        <div className="og-chips" role="group" aria-label="Filter albums">
          {["All", ...tags].map((t) => (
            <button key={t} className={`og-chip${tag === t ? " on" : ""}`} onClick={() => { setTag(t); setSel(null); }}>{t}</button>
          ))}
        </div>
      )}
      <ul className="og-grid">
        {list.map((a, i) => (
          <li key={a.cover + i} className="og-item">
            <button className="og-btn" onClick={() => setSel({ a: i, p: Math.max(0, a.photos.findIndex((p) => p.src === a.cover)) })} aria-label={a.title || "Open album"}>
              <img src={base + a.cover} alt={a.title || ""} loading="lazy" />
              {a.photos.length > 1 && <span className="og-count">{a.photos.length} photos</span>}
              {(a.title || a.date) && (
                <span className="og-cap">
                  {a.title && <b>{a.title}</b>}
                  {a.date && <small>{fmt(a.date)}</small>}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {album && photo && (
        <div className="lb-back" onClick={() => setSel(null)}>
          <div className="lb" role="dialog" aria-modal="true" aria-label={album.title || "Photo album"} onClick={(e) => e.stopPropagation()}>
            <button className="lb-x" onClick={() => setSel(null)} aria-label="Close">×</button>
            <img src={base + photo.src} alt={album.title || ""} />
            <p className="lb-cap">
              {album.title && <b>{album.title}</b>}
              {(photo.caption || album.caption) && <><br />{photo.caption || album.caption}</>}
              <small>
                {[fmt(album.date), album.tag].filter(Boolean).join(" · ")}
                {album.photos.length > 1 && `${album.date || album.tag ? " · " : ""}${sel.p + 1} / ${album.photos.length}`}
              </small>
            </p>
            {album.photos.length > 1 && (
              <div className="lb-thumbs">
                {album.photos.map((p, k) => (
                  <button key={p.src} className={k === sel.p ? "on" : ""} onClick={() => setSel({ a: sel.a, p: k })} aria-label={`Photo ${k + 1}`}>
                    <img src={base + p.src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {album.photos.length > 1 && (
            <div className="lb-nav" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => step(-1)} aria-label="Previous">‹</button>
              <button onClick={() => step(1)} aria-label="Next">›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
