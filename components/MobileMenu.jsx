"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MobileMenu({ items }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="menu-btn"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span /><span /><span />
      </button>
      <div id="mobile-nav" className={`mobile-nav${open ? " is-open" : ""}`} hidden={!open}>
        <nav aria-label="Mobile">
          {items.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label}</Link>
          ))}
          <Link href="/contact/" onClick={() => setOpen(false)}>Contact</Link>
        </nav>
      </div>
    </>
  );
}
