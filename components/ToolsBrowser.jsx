"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const IW = 1376, IH = 768, ASP = 1.05;
const PIN = "M0 0C-2 -6 -8 -9 -8 -17A8 8 0 1 1 8 -17C8 -9 2 -6 0 0Z";

function spline(P) {
  let d = "M" + P[0];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[Math.max(i - 1, 0)], b = P[i], c = P[i + 1], e = P[Math.min(i + 2, P.length - 1)];
    d += "C" + [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6, c[0], c[1]].join(" ");
  }
  return d;
}

function ExtIcon({ cy = -17, s = 0.8 }) {
  return (
    <g transform={`translate(0 ${cy}) scale(${s})`} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-2.4 2.4 L2.4 -2.4 M-0.6 -2.4 H2.4 V0.6" />
    </g>
  );
}
const isOut = (t) => t.kind === "external" || t.kind === "server";

function ServerIcon({ cy = -17, s = 0.8 }) {
  return (
    <g transform={`translate(0 ${cy}) scale(${s})`} fill="#fff">
      <circle cx="-2.4" cy=".6" r="2" /><circle cx=".2" cy="-.8" r="2.7" /><circle cx="2.8" cy=".6" r="2" />
      <rect x="-2.4" y=".6" width="5.2" height="2" />
    </g>
  );
}

export default function ToolsBrowser({ stages, tools, workflows, intro }) {
  const byId = useMemo(() => Object.fromEntries(tools.map((t) => [t.id, t])), [tools]);
  const [cur, setCur] = useState(0);
  const [full, setFull] = useState(false);
  const [cw, setCw] = useState(1000);
  const [vb, setVb] = useState([0, 0, IW, IH]);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const raf = useRef(0);

  const [q, setQ] = useState("");
  const [tag, setTag] = useState("All");
  const [wf, setWf] = useState(null);     // workflow index used as a filter
  const [group, setGroup] = useState("all"); // all | tag | stage
  const [flash, setFlash] = useState(null);

  const mobile = cw < 640;
  const u = vb[2] / cw;
  const wfTools = workflows[cur].tools;

  // measure map width
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth || 360));
    ro.observe(el);
    setCw(el.clientWidth || 360);
    return () => ro.disconnect();
  }, []);

  // zoom to the workflow on phones, full map on larger screens
  const target = useMemo(() => {
    if (!mobile || full) return [0, 0, IW, IH];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    wfTools.forEach((k) => { const [x, y] = byId[k].map; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y - 25); y1 = Math.max(y1, y + 10); });
    const pad = 90;
    let w = Math.max(x1 - x0 + 2 * pad, (y1 - y0 + 2 * pad) * ASP, 380);
    w = Math.min(w, IH * ASP);
    const h = w / ASP;
    let x = (x0 + x1) / 2 - w / 2, y = (y0 + y1) / 2 - h / 2;
    x = Math.max(0, Math.min(IW - w, x)); y = Math.max(0, Math.min(IH - h, y));
    return [x, y, w, h];
  }, [mobile, full, cur, wfTools, byId]);

  const vbRef = useRef(vb);
  vbRef.current = vb;
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = vbRef.current.slice();
    if (reduce || s.every((a, i) => Math.abs(a - target[i]) < 0.5)) { setVb(target); return; }
    const t0 = performance.now();
    const f = (now) => {
      const k = Math.min(1, (now - t0) / 450), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setVb(s.map((a, i) => a + (target[i] - a) * e));
      if (k < 1) raf.current = requestAnimationFrame(f);
    };
    raf.current = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  const route = useMemo(() => spline(wfTools.map((k) => [byId[k].map[0], byId[k].map[1] - 26])), [wfTools, byId]);

  // ---- cards ----
  const allTags = useMemo(() => {
    const c = {};
    tools.forEach((t) => t.tags.forEach((g) => { c[g] = (c[g] || 0) + 1; }));
    return Object.keys(c).sort((a, b) => c[b] - a[b] || a.localeCompare(b));
  }, [tools]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let arr = wf == null ? tools : workflows[wf].tools.map((k) => byId[k]);
    return arr.filter((t) =>
      (tag === "All" || t.tags.includes(tag)) &&
      (!s || `${t.name} ${t.desc} ${t.tags.join(" ")} ${stages[t.stage].name}`.toLowerCase().includes(s)));
  }, [tools, q, tag, wf, workflows, byId, stages]);

  const groups = useMemo(() => {
    if (group === "tag") {
      const m = new Map();
      list.forEach((t) => t.tags.forEach((g) => { if (!m.has(g)) m.set(g, []); m.get(g).push(t); }));
      return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([name, items]) => ({ name, items }));
    }
    if (group === "stage") {
      return stages.map((s, i) => ({ name: `${String(i + 1).padStart(2, "0")} ${s.name}`, items: list.filter((t) => t.stage === i), color: s.color })).filter((g) => g.items.length);
    }
    return [{ name: null, items: list }];
  }, [group, list, stages]);

  const focusTool = (id) => {
    setQ(""); setTag("All"); setWf(null);
    setFlash(id);
    setTimeout(() => {
      const el = document.getElementById("tool-" + id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 2200);
  };

  const step = (d) => { setCur((c) => (c + workflows.length + d) % workflows.length); setFull(false); };
  const showWorkflow = () => {
    setWf(cur); setQ(""); setTag("All"); setGroup("all");
    document.getElementById("tool-cards")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const w = workflows[cur];
  const num = (id) => (wf != null ? workflows[wf].tools.indexOf(id) + 1 : 0);

  return (
    <>
      <section className="tl-band" aria-label="Workflow map">
       <div className="container tl-map">
        {intro}
        <svg
          ref={svgRef}
          className="tl-svg"
          viewBox={vb.join(" ")}
          style={mobile && !full ? { height: cw / ASP } : undefined}
          role="img"
          aria-label="Map of lab tools in six regions"
        >
          <defs>
            <marker id="tl-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          <image href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/tools/map-bg.webp`} x="0" y="0" width={IW} height={IH} />
          {tools.map((t) => (
            <g key={"sh" + t.id} fill="none" stroke="#2C2C2A">
              <ellipse cx={t.map[0]} cy={t.map[1]} rx={9 * u} ry={3.4 * u} strokeOpacity=".45" strokeWidth="1" />
              {isOut(t) && (
                <ellipse cx={t.map[0]} cy={t.map[1]} rx={16 * u} ry={6 * u} strokeOpacity=".35" strokeWidth="1" strokeDasharray={`${2 * u} ${2 * u}`} />
              )}
            </g>
          ))}
          <path
            d={route}
            fill="none"
            stroke="#2C2C2A"
            strokeOpacity=".85"
            strokeLinecap="round"
            strokeWidth={2 * u}
            strokeDasharray={`${5 * u} ${5 * u}`}
            markerEnd="url(#tl-ar)"
          >
            <animate attributeName="stroke-dashoffset" from="0" to={-10 * u} dur=".8s" repeatCount="indefinite" />
          </path>
          {tools.map((t) => {
            const idx = wfTools.indexOf(t.id), on = idx >= 0, s = u * (on || hover === t.id ? 1.5 : 1.15);
            const st = stages[t.stage], [x, y] = t.map, right = t.label === "right";
            return (
              <g
                key={t.id}
                className="tl-nd"
                tabIndex={0}
                role="button"
                aria-label={`${t.name}: show card`}
                onClick={() => focusTool(t.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusTool(t.id); } }}
                onMouseEnter={() => setHover(t.id)}
                onMouseLeave={() => setHover(null)}
              >
                <g transform={`translate(${x} ${y}) scale(${s})`}>
                  <path d={PIN} fill={st.color} stroke={st.dark} strokeWidth=".8" />
                  {!on && (isOut(t) ? <ExtIcon /> : <circle cx="0" cy="-17" r="2.6" fill="#fff" />)}
                  {on && <text x="0" y="-13" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="500">{idx + 1}</text>}
                </g>
                <text
                  x={right ? x + (on ? 20 : 14) * u : x}
                  y={right ? y - (on ? 14 : 9) * u : y + (on ? 19 : 15) * u}
                  textAnchor={right ? "start" : "middle"}
                  dominantBaseline={right ? "central" : undefined}
                  fill="#2C2C2A"
                  stroke="rgba(251,247,236,.9)"
                  strokeWidth={3 * u}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                  fontSize={(on ? 13 : 12) * u}
                  fontWeight={on ? 500 : 400}
                >
                  {t.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="tl-pg">
          <button type="button" onClick={() => step(-1)} aria-label="Previous workflow">&#8249;</button>
          <span className="tl-pn">{String(cur + 1).padStart(2, "0")} / {String(workflows.length).padStart(2, "0")}</span>
          <button type="button" onClick={() => step(1)} aria-label="Next workflow">&#8250;</button>
          {mobile && <button type="button" className="tl-full" onClick={() => setFull((f) => !f)}>{full ? "Zoom to workflow" : "Full map"}</button>}
        </div>
        <p className="tl-cap">{w.name}</p>
        <p className="tl-sub">{w.sub}</p>
        <div className="tl-wf-dots" role="tablist" aria-label="Workflows">
          {workflows.map((x, i) => (
            <button key={x.name} type="button" role="tab" aria-selected={i === cur} className={i === cur ? "on" : ""} onClick={() => { setCur(i); setFull(false); }}>{x.name}</button>
          ))}
        </div>
        <div className="tl-lgd">
          <span>
            <svg width="16" height="22" viewBox="-10 -20 20 22"><path d={PIN} fill="#1D9E75" stroke="#0F6E56" strokeWidth=".8" /><circle cy="-17" r="2.6" fill="#fff" /></svg>
            Tools built by the lab
          </span>
          <span>
            <svg width="16" height="22" viewBox="-10 -20 20 22"><path d={PIN} fill="#5F5E5A" stroke="#2C2C2A" strokeWidth=".8" /><ExtIcon /></svg>
            External services (also run in-house)
          </span>
          <button type="button" className="tl-show" onClick={showWorkflow}>Show these tools below ↓</button>
        </div>
       </div>
      </section>

      <section className="tl-body container" id="tool-cards">
        <div className="tl-controls">
          <label className="search-field">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools, tags, tasks" aria-label="Search tools" />
          </label>
          <div className="tl-view" role="group" aria-label="Group cards by">
            {[["all", "All"], ["stage", "By stage"], ["tag", "By tag"]].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={group === k} className={group === k ? "on" : ""} onClick={() => setGroup(k)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="chips tl-chips">
          <button type="button" className="chip" aria-pressed={tag === "All"} onClick={() => setTag("All")}>All <span className="tl-n">{tools.length}</span></button>
          {allTags.map((g) => (
            <button key={g} type="button" className="chip" aria-pressed={tag === g} onClick={() => setTag(tag === g ? "All" : g)}>{g}</button>
          ))}
        </div>
        {wf != null && (
          <p className="pub-note tl-wfnote">
            Workflow: <b>{workflows[wf].name}</b> (numbered in step order){" "}
            <button type="button" className="tl-clear" onClick={() => setWf(null)}>Show all tools</button>
          </p>
        )}

        {list.length === 0 && <p className="muted">No tools match.</p>}
        {groups.map((g) => (
          <div key={g.name ?? "all"} className="tl-group">
            {g.name && (
              <h2 className="tl-ghead">
                {g.color && <i style={{ background: g.color }} />}
                {g.name} <span className="tl-n">{g.items.length}</span>
              </h2>
            )}
            <ul className="tl-grid">
              {g.items.map((t) => {
                const st = stages[t.stage];
                const n = num(t.id);
                const ext = /^https?:/.test(t.url || "");
                const inner = (
                  <>
                    <span className="tl-top">
                      <span className="tl-dot" style={{ background: st.color }}>{n || ""}</span>
                      <span className="tl-stage">{String(t.stage + 1).padStart(2, "0")} {st.name}</span>
                      <span className="tl-badges"><span className={`tl-kind ${t.kind}`}>{isOut(t) ? "External" : "Lab tool"}</span>{isOut(t) && t.local && <span className="tl-kind inhouse">In-house</span>}</span>
                    </span>
                    <span className="tl-name">{t.name}</span>
                    <span className="tl-desc">{t.desc}</span>
                    <span className="tl-tags">{t.tags.map((x) => <span key={x} className="tl-tag">{x}</span>)}</span>
                    <span className="tl-go">{t.url ? (ext ? "Open tool ↗" : "Open tool →") : "Link coming soon"}</span>
                  </>
                );
                const cls = `tl-card${flash === t.id ? " flash" : ""}${t.url ? "" : " off"}`;
                return (
                  <li key={t.id} id={"tool-" + t.id}>
                    {t.url ? (
                      <a className={cls} href={t.url} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}>{inner}</a>
                    ) : (
                      <div className={cls}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p className="tl-note">Cards marked External link to third-party services. Where a card says "Also run in-house", the lab runs the same kind of tool on its own server for lab members, but does not offer it publicly, so the link goes to the external service. The terms of use, data handling, availability, and results of external services are the responsibility of the service and the user. Please do not upload unpublished or confidential data to them.</p>
      </section>
    </>
  );
}
