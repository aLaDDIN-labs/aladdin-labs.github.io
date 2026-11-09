"use client";
import { useEffect, useRef, useState } from "react";

// Four method cards appear left to right, then a hand-drawn arrow sketches the way back to the first card.
const CUT = [0, 25.9, 50.4, 74.7, 100];
const rect = (a, b) => `polygon(${a}% 0,${b}% 0,${b}% 100%,${a}% 100%)`;

export default function LoopFigure({ src, w, h, alt }) {
  const ref = useRef(null);
  const [st, setSt] = useState("static");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    setSt("armed");
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setSt("on"); io.disconnect(); } }), { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`lf lf-${st}`} ref={ref}>
      <div className="lf-img" style={{ aspectRatio: `${w} / ${h}` }} role="img" aria-label={alt}>
        {[0, 1, 2, 3].map((i) => (
          <img key={i} src={src} alt="" aria-hidden="true" width={w} height={h} loading="lazy" decoding="async" className="lf-card" style={{ clipPath: rect(CUT[i], CUT[i + 1]), "--d": `${i * 480}ms` }} />
        ))}
      </div>
      <svg className="lf-arrow" viewBox="0 0 1000 86" aria-hidden="true">
        <defs>
          <filter id="lfwob" x="-3%" y="-30%" width="106%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" /></filter>
        </defs>
        <g filter="url(#lfwob)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className="lf-p lf-p1" pathLength="1" d="M872 6 C876 34 862 58 818 62 C700 72 560 52 430 64 C300 76 196 62 148 42 C132 35 128 24 128 12" />
          <path className="lf-p lf-p2" pathLength="1" d="M868 8 C870 38 850 64 806 66 C690 76 556 58 426 68 C296 80 190 66 142 46 C124 38 124 26 124 14" />
          <path className="lf-flow" d="M872 6 C876 34 862 58 818 62 C700 72 560 52 430 64 C300 76 196 62 148 42 C132 35 128 24 128 12" />
          <path className="lf-head" d="M129 4 C124 12 119 18 112 24 M129 4 C134 12 139 17 147 22" />
        </g>
        <circle className="lf-dot" r="5.5"><animateMotion dur="3.6s" repeatCount="indefinite" path="M872 6 C876 34 862 58 818 62 C700 72 560 52 430 64 C300 76 196 62 148 42 C132 35 128 24 128 12" /></circle>
      </svg>
      <p className="lf-cap">Results from each step are fed back into the models for the next round of design.</p>
    </div>
  );
}
