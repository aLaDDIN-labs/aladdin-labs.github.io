"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

const REVEAL =
  "main .section-head, main .card, main .news-card, main .latest-grid > div, main .research-block, main .phil-step, main .phil-points li, main .pcards > li, main .pv-in > *, main .news-year > h2, main .news-year .news-card, main .tabbar-wrap, main .og-item, main .contact-info, main .contact-map, main .pub-entry, main .join-block, main .prose > *";

// Inertia scrolling (Lenis) + gentle fade-up on scroll, similar to Apple's product pages.
export default function SmoothScroll() {
  const path = usePathname();

  // smooth inertia for mouse wheel / trackpad (touch keeps native scrolling)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      anchors: true,
      prevent: (node) => !!node.closest?.(".mm, .lb-back, .mobile-nav"),
    });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  // fade-up reveal; re-run on every page change
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const vh = window.innerHeight;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    const tagged = [];
    let loadIdx = 0;
    document.querySelectorAll(REVEAL).forEach((el) => {
      if (el.getBoundingClientRect().top < vh * 0.9) {
        // already on screen: a short staggered fade-up on arrival (not on the home page)
        if (path !== "/" && !el.closest(".mm-back")) {
          el.style.setProperty("--rv-delay", `${Math.min(loadIdx++, 7) * 80}ms`);
          el.classList.add("rv-load");
          tagged.push(el);
        }
        return;
      }
      const sibs = [...el.parentElement.children].filter((c) => c.matches(REVEAL));
      el.style.setProperty("--rv-delay", `${Math.min(sibs.indexOf(el), 4) * 70}ms`);
      el.classList.add("rv");
      tagged.push(el);
      io.observe(el);
    });
    return () => { io.disconnect(); tagged.forEach((el) => el.classList.remove("rv", "rv-in", "rv-load")); };
  }, [path]);

  return null;
}
