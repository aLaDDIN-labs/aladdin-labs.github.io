"use client";
import { useEffect, useRef, useState } from "react";

// Overlay boxes, in percent of the 1376x768 artwork. Hovering a protein fades in its colourful version.
const PARTS = [{"id": "p1", "x": 8.794, "y": 19.792, "w": 8.503, "h": 11.979}, {"id": "p2", "x": 25.581, "y": 6.771, "w": 15.916, "h": 27.604}, {"id": "p3", "x": 56.323, "y": 23.047, "w": 4.07, "h": 7.031}, {"id": "p4", "x": 88.663, "y": 33.724, "w": 8.358, "h": 13.411}, {"id": "p5", "x": 76.744, "y": 53.255, "w": 19.549, "h": 40.365}, {"id": "p6", "x": 0.0, "y": 56.38, "w": 29.07, "h": 43.62}];

export default function CarpetHero() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const canvasRef = useRef(null);
  const labelRef = useRef(null); // { w, h, data }
  const [active, setActive] = useState(0);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        labelRef.current = { w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
      } catch { labelRef.current = null; }
    };
    img.src = `${base}/images/philosophy/labels.png`;
  }, [base]);

  // Touch screens have no hover: cycle through the proteins slowly until the visitor taps one.
  const touched = useRef(false);
  useEffect(() => {
    if (!window.matchMedia("(hover: none)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { if (!touched.current) setActive((a) => (a % PARTS.length) + 1); }, 2400);
    return () => clearInterval(t);
  }, []);

  const pick = (e) => {
    const L = labelRef.current, el = canvasRef.current;
    if (!L || !el) return 0;
    const r = el.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
    const x = Math.min(L.w - 1, Math.floor(u * L.w)), y = Math.min(L.h - 1, Math.floor(v * L.h));
    return Math.round(L.data[(y * L.w + x) * 4] / 40);
  };

  return (
    <section
      className="carpet-stage"
      onPointerMove={(e) => setActive(pick(e))}
      onPointerDown={(e) => { touched.current = true; setActive(pick(e)); }}
      onPointerLeave={() => setActive(0)}
    >
      <div ref={canvasRef} className="carpet-canvas" aria-hidden="true">
        <img className="carpet-base" src={`${base}/images/philosophy-carpet.webp`} alt="" width="1800" height="1006" />
        <div className="carpet-scrim" />
        {PARTS.map((p, i) => (
          <img
            key={p.id}
            className={"carpet-part" + (active === i + 1 ? " is-on" : "")}
            src={`${base}/images/philosophy/${p.id}.webp`}
            alt=""
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%` }}
          />
        ))}
      </div>
      <div className="container carpet-text">
        <p className="eyebrow">Philosophy</p>
        <h1 className="phil-title">
          <span className="light">The aLaDDIN Philosophy</span>
          <strong><span className="hl">The Magic Carpet Ride Across Chemical Space</span></strong>
        </h1>
        <p className="phil-sub">
          Navigating the infinite molecular cosmos to connect atomic dynamics with biological function.
        </p>
      </div>
    </section>
  );
}
