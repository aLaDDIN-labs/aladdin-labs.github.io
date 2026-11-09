"use client";
import { useEffect, useRef, useState } from "react";

// Three-panel figure that builds up from the left: panel, arrow, panel, arrow, panel.
// The same image is stacked in layers and each layer is clipped to one part of it.
const P = (pts) => `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(",")})`;
const A = [15.4, 23.4];            // arrow band, % of height
const B1 = 33.0, B2 = 66.9;        // panel borders, % of width
const A1 = [29.0, 36.5], A2 = [62.2, 69.9];
const rect = (x0, x1) => [[x0, A[0]], [x1, A[0]], [x1, A[1]], [x0, A[1]]];
const collapsed = (x0) => [[x0, A[0]], [x0, A[0]], [x0, A[1]], [x0, A[1]]];

const LAYERS = [
  { k: "p1", cls: "ff-p", d: 0, clip: P([[0, 0], [B1, 0], [B1, A[0]], [A1[0], A[0]], [A1[0], A[1]], [B1, A[1]], [B1, 100], [0, 100]]) },
  { k: "a1", cls: "ff-a", d: 750, from: P(collapsed(A1[0])), clip: P(rect(A1[0], A1[1])) },
  { k: "p2", cls: "ff-p", d: 1250, clip: P([[B1, 0], [B2, 0], [B2, A[0]], [A2[0], A[0]], [A2[0], A[1]], [B2, A[1]], [B2, 100], [B1, 100], [B1, A[1]], [A1[1], A[1]], [A1[1], A[0]], [B1, A[0]]]) },
  { k: "a2", cls: "ff-a", d: 2000, from: P(collapsed(A2[0])), clip: P(rect(A2[0], A2[1])) },
  { k: "p3", cls: "ff-p", d: 2500, clip: P([[B2, 0], [100, 0], [100, 100], [B2, 100], [B2, A[1]], [A2[1], A[1]], [A2[1], A[0]], [B2, A[0]]]) },
];

export default function FlowFigure({ src, alt, w, h }) {
  const ref = useRef(null);
  const [st, setSt] = useState("static"); // static (SSR / reduced motion) -> armed -> on
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    setSt("armed");
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setSt("on"); io.disconnect(); } }), { threshold: 0.35 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`ff ff-${st}`} style={{ aspectRatio: `${w} / ${h}` }} role="img" aria-label={alt}>
      {LAYERS.map((l) => (
        <img key={l.k} src={src} alt="" aria-hidden="true" width={w} height={h} loading="lazy" decoding="async"
          className={l.cls}
          style={{ "--d": `${l.d}ms`, "--clip": l.clip, "--from": l.from || l.clip, clipPath: st === "armed" ? l.from || l.clip : l.clip }} />
      ))}
    </div>
  );
}
