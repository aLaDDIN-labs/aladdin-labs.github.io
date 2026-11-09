"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

const REVEAL =
  "main .section-head, main .card, main .news-card, main .latest-grid > div, main .research-block, main .phil-step, main .phil-points li, main .pcards > li, main .pv-in > *, main .news-year > h2, main .news-year .news-card, main .tabbar-wrap, main .og-item, main .contact-info, main .contact-map, main .pub-entry, main .join-block, main .prose > *, main .rs-intro > *, main .rs-part1 > *, main .rs-qtext > *, main .rs-card, main .rs-plat > .eyebrow, main .rs-plat > h2, main .rs-step, main .rs-return, main .rs-fb, main .rs-tools > *";

// Inertia scrolling (Lenis) + gentle fade-up on scroll, similar to Apple's product pages.
export default function SmoothScroll() {
  const path = usePathname();
  const lenisRef = useRef(null);

  // smooth inertia for mouse wheel / trackpad (touch keeps native scrolling)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      anchors: true,
      prevent: (node) => !!node.closest?.(".mm, .lb-back, .mobile-nav"),
    });
    lenisRef.current = lenis;
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); lenisRef.current = null; };
  }, []);

  // every page change starts at the top. Lenis keeps its own scroll position and CSS `scroll-behavior: smooth`
  // would animate window.scrollTo, so reset instantly and repeat briefly to beat Next's own scroll handling.
  useEffect(() => {
    try { window.history.scrollRestoration = "manual"; } catch {}
    if (window.location.hash) return;
    const root = document.documentElement;
    const top = () => {
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      const l = lenisRef.current;
      if (l) { l.resize(); l.scrollTo(0, { immediate: true, force: true }); }
      window.scrollTo(0, 0);
      root.style.scrollBehavior = prev;
    };
    top();
    const raf = requestAnimationFrame(top);
    const t1 = setTimeout(top, 120), t2 = setTimeout(top, 400);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [path]);

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
